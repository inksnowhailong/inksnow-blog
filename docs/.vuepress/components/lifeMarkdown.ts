/**
 * 日志正文的 Markdown 渲染
 * @description 日志从「一句话」变成「一篇整理稿」之后，正文里会带标题、列表、
 * 代码块——再用 whitespace-pre-wrap 平铺，一屏全是 `##` 和 `- `，读不了。
 *
 * 为什么手写而不装 markdown-it：这个仓库的依赖是使用者自己在维护的，为一处
 * 展示改 package.json 会把他没提交完的改动卷进来；而日志正文的来源只有两个
 * （人手写、会话整理稿），用到的语法就是下面这几条，手写一份反而看得见边界。
 *
 * 安全上只认一条铁律：**先整段转义，再往里插标签**。转义之后正文里不可能再有
 * 活的 `<`，后面插进去的每个标签都是这里自己写的字面量，`v-html` 才敢喂。
 * 顺序反过来（先渲染再转义）等于把自己插的标签也转义掉，是另一个方向的错。
 */

/**
 * 日志正文的字数上限
 * @description 与后端 rules.ts 的 NOTE_MAX 是同一个数，写在一处是因为它在
 * 三条输入条上都要用：输入框的 maxlength 比后端小，多打的字会被悄悄吃掉；
 * 比后端大，人写完提交才被打回来
 */
export const NOTE_MAX = 20000;

/** 允许出现在 href 上的协议：其余（尤其 `javascript:`）一律当普通文字 */
const SAFE_HREF = /^(https?:\/\/|mailto:|\/|#)/i;

/** 自动链接尾部常见的标点，不该被吞进 URL 里 */
const TAIL_PUNCT = /[.,;:!?，。；：！？、)）]+$/;

/**
 * HTML 转义
 * @description 单引号也转，免得以后有人把它插进单引号包的属性里
 * @param text 原文
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 行内语法：代码、链接、粗体、裸 URL
 * @description 一次 replace 走完四种，不分四遍跑——分遍跑的话前一遍插出来的
 * `<a href="http://…">` 会被后一遍的裸 URL 规则再咬一口，套出嵌套的 a 标签
 * @param escaped 已经转义过的一行（或一段）文字
 */
function renderInline(escaped: string): string {
  // 裸 URL 只吃 ASCII 里合法的那些字符：写成 `[^\s]+` 的话，中文句子里
  // 「https://a.com/doc，后面这句」会被整句吞进 href
  const pattern =
    /`([^`]+)`|\[([^\]\n]+)\]\(([^()\s]+)\)|\*\*([^*\n]+)\*\*|(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/g;
  return escaped.replace(
    pattern,
    (whole, code, linkText, linkUrl, bold, bareUrl) => {
      if (code !== undefined) return `<code>${code}</code>`;
      if (linkText !== undefined) {
        // 协议不认识就整段按原文留着，宁可显示成 `[x](javascript:…)` 也不给它一个可点的 a
        if (!SAFE_HREF.test(linkUrl)) return whole;
        return anchor(linkUrl, linkText);
      }
      if (bold !== undefined) return `<strong>${bold}</strong>`;
      const tail = bareUrl.match(TAIL_PUNCT)?.[0] ?? '';
      const url = tail ? bareUrl.slice(0, -tail.length) : bareUrl;
      return anchor(url, url) + tail;
    },
  );
}

/** 一个外链；target=_blank 必须配 noopener，否则新页能反手改写来源页 */
function anchor(href: string, text: string): string {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
}

/**
 * 把一段 Markdown 渲染成 HTML
 * @description 支持的就这些：`#`~`###` 标题、`-`/`*`/`1.` 列表（按缩进嵌套）、
 * ``` 围栏代码块、行内 `code`、`**粗体**`、`[文字](链接)` 与裸 URL、段落。
 * 其余语法（表格、引用、图片）原样当文字显示——日志里没出现过，先不养。
 * @param text 日志正文
 * @returns 可以直接喂 `v-html` 的 HTML 串
 */
export function renderMarkdown(text: string): string {
  const lines = escapeHtml(String(text ?? ''))
    .replace(/\r\n?/g, '\n')
    .split('\n');

  const out: string[] = [];
  /** 打开着的列表层，栈顶是当前这一层；indent 用来判断下一行是同级、更深还是该收 */
  const stack: Array<{ tag: 'ul' | 'ol'; indent: number }> = [];
  let para: string[] = [];

  /** 段落是攒够了再吐：连续几行没有空行隔开时算同一段，中间用 br 断行 */
  const flushPara = () => {
    if (!para.length) return;
    out.push(`<p>${renderInline(para.join('<br>'))}</p>`);
    para = [];
  };
  /** 收到只剩 depth 层；每收一层要先关掉那一层最后一个没闭合的 li */
  const closeLists = (depth: number) => {
    while (stack.length > depth) out.push(`</li></${stack.pop()!.tag}>`);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 围栏代码块：里面一律当字面量，不再认任何 Markdown
    const fence = line.match(/^\s*```/);
    if (fence) {
      flushPara();
      closeLists(0);
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      out.push(`<pre><code>${body.join('\n')}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushPara();
      closeLists(0);
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2].trim())}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^(\s*)[-*+]\s+(.*)$/);
    const ordered = line.match(/^(\s*)\d+[.)]\s+(.*)$/);
    if (bullet || ordered) {
      const m = (bullet || ordered)!;
      const indent = m[1].length;
      const tag: 'ul' | 'ol' = bullet ? 'ul' : 'ol';
      flushPara();
      // 比栈顶浅：收到第一个「缩进不比我深」的层
      while (stack.length && indent < stack[stack.length - 1].indent) {
        closeLists(stack.length - 1);
      }
      const top = stack[stack.length - 1];
      if (!top || indent > top.indent) {
        // 更深的一层开在当前 li 里面，所以这里不关 li
        out.push(`<${tag}>`);
        stack.push({ tag, indent });
      } else if (top.tag !== tag) {
        closeLists(stack.length - 1);
        out.push(`<${tag}>`);
        stack.push({ tag, indent });
      } else {
        out.push('</li>');
      }
      out.push(`<li>${renderInline(m[2].trim())}`);
      continue;
    }

    if (!line.trim()) {
      // 空行只断段落，不收列表：项之间空一行仍是同一个列表
      flushPara();
      continue;
    }

    // 普通文字：出现在列表后面就意味着列表结束了
    closeLists(0);
    para.push(line.trim());
  }

  flushPara();
  closeLists(0);
  return out.join('');
}

/**
 * 取正文开头那一段
 * @description 列表里只给这一段，全文等点开再看。去掉 Markdown 标记是因为
 * 折叠态是纯文本插值，留着 `##` 只会让人以为记坏了。
 * @param text 日志正文
 * @param max 超过这么多字就截断加省略号
 * @returns 纯文本，给 `{{ }}` 用；**不要**喂 v-html（它没有经过转义）
 */
export function firstParagraph(text: string, max = 160): string {
  const lines = String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n');

  const picked: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    // 开头的空行和围栏跳过，正文开始之后遇到它们就收尾
    if (!line || /^```/.test(line)) {
      if (picked.length) break;
      continue;
    }
    picked.push(stripMarks(line));
  }

  const brief = picked.join(' ').replace(/\s+/g, ' ').trim();
  return brief.length > max ? brief.slice(0, max) + '…' : brief;
}

/** 去掉一行上的 Markdown 标记，只留字 */
function stripMarks(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/^>\s?/, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim();
}

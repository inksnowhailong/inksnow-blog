import * as fs from 'node:fs';
import * as path from 'node:path';

function isHiddenMarkdownFile(filePath: string): boolean {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatterMatch = content.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

        if (!frontmatterMatch) {
            return false;
        }

        const frontmatter = frontmatterMatch[1];
        return /^draft:\s*true\s*$/m.test(frontmatter) || /^hidden:\s*true\s*$/m.test(frontmatter);
    } catch (error) {
        console.error(`读取文章出错：${(error as Error).message}`);
        return false;
    }
}

/**
 * 递归获取指定目录下的所有 .md 文件路径
 * @param {string} dir - 要搜索的目录路径
 * @returns {Promise<string[]>} - 包含 .md 文件路径的数组
 */
export function getAllMdFilesSync(dir: string): string[] {
    let mdFiles: string[] = [];

    try {
        // 读取目录内容，获取目录下的所有文件和子目录（同步）
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        // 遍历目录项
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                // 如果是子目录，递归调用函数获取子目录下的 .md 文件
                const filesInSubDir = getAllMdFilesSync(fullPath);
                mdFiles = mdFiles.concat(filesInSubDir);
            } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') {
                // 草稿或隐藏文章不参与导航和列表生成
                if (!isHiddenMarkdownFile(fullPath)) {
                    mdFiles.push(fullPath);
                }
            }
        }
    } catch (error) {
        console.error(`读取目录出错：${(error as Error).message}`);
    }

    return mdFiles;
}

export function mdPathFormat(paths:string[],splitDir:string){
    return paths.map((path)=>{
        return path.replace(/\\/g,'/').split(splitDir)[1]
    })

}

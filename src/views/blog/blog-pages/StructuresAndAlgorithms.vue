<template>
  <div>
    <h1>数据结构</h1>
    <h2>1、线性表：数组、链表、栈、队列</h2>
    <p>
      <span class="parse"> 线性表是为了解决单线储存而出现的。 </span>
      最基础结构为数组和链表，栈和堆是线性表的特殊形态，在操作上进行了限制。构造一个栈或堆结构，既可以使用数组，也可以使用链表
    </p>
    <h2>1.1 数组</h2>
    <p>
      数组：就是<span class="parse">最简单粗暴的储存方式。</span
      >就是直接拉出一大块数据存在那里。数组的快速存取其实是一个副作用，因为所有的数据
      都要在一起，可以直接算出来数据的地址。数组的优势是连续内存，可以快速读取。缺点是插入比较苦难，需要后面数据挪位置。
    </p>
    <span class="cite"
      >c/c++语言的数组更接近数据结构的数组概念，默认是不能动态扩容的。js高级语言的数组概念就包含更多，比如动态扩容、语言层自实现栈、队列特性。
    </span>
    <h2>1.2链表</h2>
    <p>
      链表：则是为了<span class="parse">解决可以无限增长的需求。</span>
      因为找不到一大块可以连续的存入数据，甚至也不知道程序可能使用的数据总量，所以就没办法划分一块数据来使用，
      花销了不够用，划大了浪费（这在早年是非常大的事情。）所以必须想办法解决问题。最后采用的方法是从入口开始，每一个数据块不仅仅是有数据，还会有指向下一个数据块的索引，用来找到下一个数据，
      这就是链表
    </p>
    <pre v-highlightjs>
        <code class="javascript">
          // js链表数据结构
        let Node = function(element) {.0
            this.element = element
            this.next = null // 下个node的引用（在js语言中，Node类已经是引用类型了）
        }
        </code></pre>
    <p>
      还有双向链表，只是加了一个上一个node的索引。不仅如此，队列，栈，都是线性表的特殊形态。进行了操作上的限制罢了。既可以是数组，也可以是链表
    </p>
    <pre v-highlightjs>
        <code class="javascript">
         // js双向链表数据结构
        let Node = function(element) {
            this.element = element
            this.next = null
            this.prev = null
        }
        </code></pre>
    <span class="cite">
      数组和链表都是一种数据结构，数组是开辟整块内存，链表则拥有next指针，指向下一个node节点。
    </span>
    <h2>1.3堆、栈/队列</h2>
    <span class="parse"> 都是一种数据结构 </span>
    <ul>
      <li>
        堆：堆是一种<span class="parse">经过排序的树形数据结构，</span
        >每个结点都有一个值。通常我们所说的堆的数据结构，是指二叉堆。堆的特点是根结点的值最小（或最大）
        ，且根结点的两个子树也是一个堆（有序）。由于堆的这个特性，常用来实现优先队列。<span
          class="parse"
          >堆的存取是随意</span
        >，这就如同我们在图书馆的书架上取书，
        虽然书的摆放是有顺序的，但是我们想取任意一本书时候，不必像栈一样，从前面一个个取到需要的书为止，书架这机制不同于箱子，我们可以直接取出我们想要的书
      </li>
      <li>
        栈：属于一维线性关系，记上<span class="parse">后进先出规则。</span
        >后存放的先取，先存放的后取，无法从中间插入和删除
      </li>
      <li>队列：也属于一维关系，<span class="parse">先进先出原则。</span></li>
    </ul>
    <span class="cite"
      >千万不要把堆和队列搞混了，他们是三种不同的数据结构，栈和队列相似，堆完全不同</span
    >
    <h2>1.3.1 堆和栈的应用</h2>
    <ul>
      <li>
        堆：最常见的应用就是<span class="parse">函数执行栈，</span
        >当有大函数嵌套小函数时，先逐一把所有函数压入栈中。依据后进先出，先执行最后的小函数，直到执行完所有函数。
      </li>
      <li>
        堆：在js等高级语言中，基本类型有Undefined、Null、Boolean、Number和String。这些类型在内存中分别占有固定大小的空间，所以使用栈空间来保存。
        而<span class="parse">引用类型，</span>
        你根本不知道这个类型需要多大的内存空间，所以推荐使用堆存储最好不过。
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
ul {
  & > li {
    list-style: disc;
  }
}
</style>

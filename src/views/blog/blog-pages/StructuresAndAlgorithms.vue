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
    <pre class="line-numbers">
        <code v-prism class="language-javascript">
          // js链表数据结构
        let Node = function(element) {.0
            this.element = element
            this.next = null // 下个node的引用（在js语言中，Node类已经是引用类型了）
        }
        </code></pre>
    <p>
      还有双向链表，只是加了一个上一个node的索引。不仅如此，队列，栈，都是线性表的特殊形态。进行了操作上的限制罢了。既可以是数组，也可以是链表
    </p>
    <pre class="line-numbers">
        <code v-prism class="language-javascript">
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
      <h2>
        1.3.2为什么会有<span class="parse">栈内存</span>和<span class="parse"
          >堆内存</span
        >之分
      </h2>
      <p>通常与垃圾回收机制有关，为了使程序运行时占用的内存最小。</p>
      <p>
        当一个方法执行时；<span class="parse"
          >每个方法都会建立自己的内存栈，</span
        >在这个方法内定义变量将会逐个放入这块栈内存里，随着方法的执行结束
        这个方法的内存栈也将自然销毁了。因此所有在方法中定义的变量，都是放在栈内存中的；
      </p>
      <p>
        当我们在程序中<span class="parse"
          >创建一个对象时，这个对象将被保存到运行时数据区中，</span
        >以便反复利用（因为对象的创建成本通常较大），这个运行时数据区就是堆内存。
        <span class="parse">堆内存中的对象不会所方法的结束而销毁，</span
        >即使方法结束后，这个对象还可能被另一个变量引用（方法的
        参数传递时很常见），则这个对象依然不会被销毁，只有
        当一个对象没有任何引用变量引用它的时候，这个对象就彻底丢失了，系统的垃圾回收机制才会在合适的时候回收它
      </p>
      <p>
        在c语言这类没有垃圾回收机制的语言中，定义基本类型如char时，系统会自动在栈上为其开辟空间，而堆是需要程序员自己申请空间，如malloc(10)。由于栈上的空间是自动回收的，所以栈上的
        数据的生存周期只是在函数的运行过程中，运行后就释放掉，不可以再访问。而堆上的数据只要程序员不释放空间，就一直可以访问到，不过缺点是一旦忘记释放会造成内存泄漏
      </p>
      <h2>总结</h2>
      <ul>
        <li>数组（连续存储）</li>
        <li>链表（离散存储）</li>
        <ul>
          <li class="li-circle">
            有序表：要求插入元素时，对元素对值进行比较，以找到相应的插入位置。
          </li>
          <li class="li-circle">顺序表、单链表、循环链表、双向链表</li>
        </ul>
        <li>
          栈（线性结构常见应用，由链表或数组增删和改进功能实现）。特点是先进后出；
        </li>
        <li>
          队列（线性结构常见应用，由链表或数组增删和改进功能实现）。特点是先进先出；
        </li>
      </ul>
    </ul>
    <p>
      数组和链表是最基础的数据结构，<span class="parse"
        >以相同的功能实现可以用数组结构，也可以用链表结构</span
      >，如栈与队列的实现，可以底层存储是用数组，也可以是小块内存链接起来的链表。
      再比如数组的reverse翻转，使用数组或链表数据结构，相关算法是完全不一样的。
    </p>
    <h2>2.集合、字典/散列表</h2>
    <p>都属于非顺序数据结构</p>
    <ul>
      <li>
        <span class="parse">集合：</span
        >一组无序且唯一的项组成，可以理解为没有重复元素且没有顺序的数组（集合只存储value）。javascript
        ES6新增Set数据结构即为此
      </li>
      <ul>
        <li class="li-circle">js set： 无序不可重复的多个value的集合体</li>
      </ul>
      <li>
        <span class="parse">字典：</span
        >也称作映射，使用{key:value}键值对的形式存储数据。javascriptES6新增Map数据结构即为此
      </li>
      <ul>
        <li class="li-circle">js map：无序的key不重复的多个key-value的集合体</li>
        <li class="li-circle">散列表：是实现字典的一种方式，散列算法的作用，是尽可能在数据结构中找到一个值（O（1）时间复杂度）。其中最重要的，
        就是选择一个好的<span class="parse">散列函数</span>，给定一个键值，然后返回值在表中的位置</li>
      </ul>
    </ul>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
ul {
  li {
    list-style: disc;
    margin-left: 1em;
  }
  .li-circle {
    margin-left: 2em;
    list-style: circle;
    &:first-child {
      margin-top: 5px;
    }
    &:last-child {
      margin-bottom: 5px;
    }
  }
}
</style>

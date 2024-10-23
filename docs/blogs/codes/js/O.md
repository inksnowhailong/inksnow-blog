---
title: 算法的大O复杂度的说法
date: 2024-10-22
categories:
  - 编程
tags:
  - JS/TS
---
这种东西，学的时候知道，然后就给忘了，不过写一次，就是回想和思考一次，也许就能真正思考到项目众如何使用起来。
## 首先，为什么要研究这个？
::: tip
  为了能让你开发的东西能做的更好
:::

对于大多数情况来说，对于开发的程序或者软件来说，语言和框架，已经帮我们做到了很多优化，若非特殊需求，几乎是不需要将这些算法应用到开发中的。
常见的算法，也都会有前人写好的工具函数来直接使用。但是为了能从最基础的开发人员，向技术更深一步迈进，就需要去了解这些。

- **资源权衡**,让你在时间和空间的角度，权衡并决策应当使用哪一种方式来执行你的程序。比如你要做一个嵌入式系统的应用，那么优化内存的使用是很关键的。
- **算法优化**，根据你的项目某些计算的计算量，选择使用不同算法，如果计算量小，指数阶会表现更快，如果计算量大，那么换用对数阶算法也许是更好选择。

## 时间复杂度

所谓时间复杂度，是在说算法运行的时间随着数据越来越大，所需要运行的时间增长趋势。

设输入的数据量为```n```，那么常见的时间复杂度：
**常数阶O(1) < 对数阶O(logn) < 线性阶O(n) < 线性对数阶O(nlogn) < 平方阶O(n²) < 指数阶O(2ⁿ) < 阶乘阶O(n!)**
<img src='https://www.hello-algo.com/chapter_computational_complexity/time_complexity.assets/time_complexity_common_types.png' alt="时间复杂度">

## 空间复杂度
空间复杂度表示算法在运行过程中额外占用的内存空间
<img src='https://www.hello-algo.com/chapter_computational_complexity/space_complexity.assets/space_complexity_common_types.png' alt="空间复杂度">

## 时间复杂度示例js代码

### 常数阶O(1)
常数时间复杂度表示算法的执行时间不会随着输入规模变化，它总是固定的。
```js
function constantOperation(arr) {
  // 无论数组多大，只执行一次
  console.log(arr[0]); // 常数时间操作
}
```

### 对数阶O(logn)
对数时间复杂度通常出现在折半查找等场景，例如二分查找。
```js
function logarithmicOperation(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    if (arr[mid] === target) return mid; // 找到目标，退出
    else if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }

  return -1; // 未找到
}

```

### 线性阶O(n)
```js
function linearOperation(arr) {
  for (let i = 0; i < arr.length; i++) {
    console.log(arr[i]); // 遍历数组，每次访问一个元素
  }
}
```

### 线性对数阶O(nlogn)
```js
function mergeSort(arr) {
  if (arr.length <= 1) return arr;

  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));

  return merge(left, right);
}

function merge(left, right) {
  let result = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] < right[j]) result.push(left[i++]);
    else result.push(right[j++]);
  }

  return result.concat(left.slice(i)).concat(right.slice(j));
}
```

### 平方阶O(n²)
```js
function bubbleSort(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]; // 交换
      }
    }
  }
  return arr;
}
```

### 指数阶O(2ⁿ)
```js
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
```

### 阶乘阶O(n!)
```js
function permute(arr) {
  if (arr.length === 0) return [[]];

  let result = [];

  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
    const remainingPermutations = permute(remaining);

    for (let permutation of remainingPermutations) {
      result.push([current].concat(permutation));
    }
  }

  return result;
}
```


## 空间复杂度示例js代码
### 常数阶O(1)
```js
function constantSpaceOperation(arr) {
  let sum = 0; // 只使用了一个额外的变量，空间复杂度为 O(1)
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i]; // 仅在已有数组上进行操作
  }
  return sum;
}

```
### 对数阶O(logn)
```js
function binarySearchRecursive(arr, target, left = 0, right = arr.length - 1) {
  if (left > right) return -1; // 递归调用栈深度为 O(logn)

  const mid = Math.floor((left + right) / 2);

  if (arr[mid] === target) return mid;
  else if (arr[mid] < target) return binarySearchRecursive(arr, target, mid + 1, right);
  else return binarySearchRecursive(arr, target, left, mid - 1);
}


```
### 线性阶O(n)
```js
function linearSpaceOperation(arr) {
  let newArr = []; // 创建一个新数组，空间复杂度 O(n)
  for (let i = 0; i < arr.length; i++) {
    newArr.push(arr[i] * 2); // 根据输入大小创建新数组
  }
  return newArr;
}

```
### 线性对数阶O(nlogn)
```js
function mergeSortSpace(arr) {
  if (arr.length <= 1) return arr;

  const mid = Math.floor(arr.length / 2);
  const left = mergeSortSpace(arr.slice(0, mid));  // 递归调用，空间复杂度与输入规模成对数关系
  const right = mergeSortSpace(arr.slice(mid));

  return merge(left, right);
}

```
### 平方阶O(n²)
```js
function matrixMultiplication(matrixA, matrixB) {
  let result = Array(matrixA.length)
    .fill(0)
    .map(() => Array(matrixB[0].length).fill(0)); // 创建二维数组，空间复杂度 O(n²)

  for (let i = 0; i < matrixA.length; i++) {
    for (let j = 0; j < matrixB[0].length; j++) {
      for (let k = 0; k < matrixB.length; k++) {
        result[i][j] += matrixA[i][k] * matrixB[k][j];
      }
    }
  }

  return result;
}

```
### 指数阶O(2ⁿ)
```js
function fibonacciSpace(n) {
  if (n <= 1) return n;
  return fibonacciSpace(n - 1) + fibonacciSpace(n - 2); // 递归树的深度和规模成指数关系，空间复杂度 O(2ⁿ)
}

```
### 阶乘阶O(n!)
```js
function permuteSpace(arr) {
  if (arr.length === 0) return [[]];

  let result = [];

  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
    const remainingPermutations = permuteSpace(remaining);

    for (let permutation of remainingPermutations) {
      result.push([current].concat(permutation));
    }
  }

  return result; // 每生成一个新排列，结果集的大小都会增加，空间复杂度 O(n!)
}

```

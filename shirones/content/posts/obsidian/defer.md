---
title: Go defer
published: 2026-07-31
description: defer 做的事情很简单：把一句函数调用放到当前函数快结束的时候再执行。 它最常出现在“打开了什么，就要关掉什么”的地方： 文件打开成功后，马上写 defer f.Close()。后面代码就算提前 return，也不会忘记关文件。 多个 defer 不是按出现顺序执行，而是反着来。 输出： 可以当成一个栈：最后登记的
image: ""
tags:
  - Go
  - Go全栈开发
  - defer
  - GO全栈开发
  - Obsidian
category: GO全栈开发
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# Go defer

`defer` 做的事情很简单：把一句函数调用放到当前函数快结束的时候再执行。

它最常出现在“打开了什么，就要关掉什么”的地方：

```go
func readFile(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	// 这里开始读文件
	return nil
}
```

文件打开成功后，马上写 `defer f.Close()`。后面代码就算提前 `return`，也不会忘记关文件。

## 执行顺序

多个 `defer` 不是按出现顺序执行，而是反着来。

```go
func main() {
	defer fmt.Println("first")
	defer fmt.Println("second")
	defer fmt.Println("third")
}
```

输出：

```text
third
second
first
```

可以当成一个栈：最后登记的 defer，最先执行。

资源释放时这个顺序挺合理：

```go
mu.Lock()
defer mu.Unlock()

f, err := os.Open("data.txt")
if err != nil {
	return err
}
defer f.Close()
```

退出时先关文件，再解锁。

## defer 和 return

Go 里遇到 `return` 时，不是马上跳出函数。大概分三步：

1. 先算返回值
2. 再执行 defer
3. 最后真正返回

看这个例子：

```go
func test() int {
	num := 10
	defer func() {
		num++
	}()
	return num
}
```

返回值是 `10`。

因为执行到 `return num` 时，Go 已经先把 `num` 当前的值算出来了，也就是 `10`。之后 defer 里的 `num++` 改的是局部变量 `num`，不是已经准备好的返回值。

可以粗略想成：

```go
func test() int {
	num := 10
	ret := num

	func() {
		num++
	}()

	return ret
}
```

所以最后还是 `10`。

## 命名返回值

如果函数写了命名返回值，情况会变。

```go
func test() (num int) {
	num = 10
	defer func() {
		num++
	}()
	return
}
```

这个返回 `11`。

这里的 `num` 不只是普通局部变量，它就是返回值本身。defer 改了 `num`，调用方拿到的也是改完之后的值。

这个也返回 `11`：

```go
func test() (num int) {
	num = 10
	defer func() {
		num++
	}()
	return num
}
```

刚开始学时，重点不是学会这样写，而是别被面试题绕住。实际写项目时，用 defer 修改命名返回值要谨慎，读代码的人容易停下来想半天。

## 参数什么时候确定

`defer` 后面如果直接跟函数调用，参数会在这一行就确定下来。

```go
func main() {
	num := 10
	defer fmt.Println(num)
	num = 20
}
```

输出：

```text
10
```

因为 `defer fmt.Println(num)` 执行到这一行时，`num` 已经作为参数取值了。

但闭包不一样：

```go
func main() {
	num := 10
	defer func() {
		fmt.Println(num)
	}()
	num = 20
}
```

输出：

```text
20
```

闭包读的是变量本身。等函数退出、defer 真正执行时，`num` 已经变成 `20` 了。

对比一下：

```go
defer fmt.Println(num) // 现在就把 num 的值拿出来

defer func() {
	fmt.Println(num) // 退出时再读 num
}()
```

## 常见用法

关闭文件：

```go
f, err := os.Open(path)
if err != nil {
	return err
}
defer f.Close()
```

释放锁：

```go
mu.Lock()
defer mu.Unlock()
```

取消 context：

```go
ctx, cancel := context.WithTimeout(context.Background(), time.Second)
defer cancel()
```

关闭 HTTP 响应体：

```go
resp, err := http.Get(url)
if err != nil {
	return err
}
defer resp.Body.Close()
```

## 记法

`defer` 可以先按这几句记：

- 当前函数退出前执行
- 多个 defer 反着执行
- return 先算返回值，再跑 defer
- 普通参数马上求值，闭包变量退出时再读

写代码时，拿到资源后马上 defer 清理，一般就不会错得太离谱。

---
title: Go Channel 与 select
published: 2026-08-01
description: goroutine 让代码并发跑起来，channel 负责让 goroutine 之间说话。 创建一个 channel： 这个 ch 只能传 string。 <- 是 channel 的收发语法。 发送： 意思是把 "hello" 放进 ch。 接收： 意思是从 ch 里取一个值，赋给 msg。 只接收、不关心值： 这
image: ""
tags:
  - Go
  - Go全栈开发
  - channel
  - select
  - GO全栈开发
  - Obsidian
category: GO全栈开发
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# Go Channel 与 select

goroutine 让代码并发跑起来，channel 负责让 goroutine 之间说话。

创建一个 channel：

```go
ch := make(chan string)
```

这个 `ch` 只能传 `string`。

## `<-` 是什么

`<-` 是 channel 的收发语法。

发送：

```go
ch <- "hello"
```

意思是把 `"hello"` 放进 `ch`。

接收：

```go
msg := <-ch
```

意思是从 `ch` 里取一个值，赋给 `msg`。

只接收、不关心值：

```go
<-ch
```

这种经常用来等一个信号。

比如：

```go
case <-ctx.Done():
	return
```

它不是为了拿到什么业务数据，只是等 context 被取消。

## 无缓冲 channel

默认创建的是无缓冲 channel：

```go
ch := make(chan string)
```

无缓冲 channel 要求发送和接收同时出现。

```go
func main() {
	ch := make(chan string)

	go func() {
		ch <- "hello"
	}()

	msg := <-ch
	fmt.Println(msg)
}
```

后台 goroutine 发送，main goroutine 接收，所以能跑。

如果只有发送，没有接收：

```go
func main() {
	ch := make(chan string)
	ch <- "hello"
}
```

会死锁。

如果只有接收，没有发送：

```go
func main() {
	ch := make(chan string)
	msg := <-ch
	fmt.Println(msg)
}
```

也会死锁。

无缓冲 channel 很像一次当面交接：你给的时候，必须有人接。

## 有缓冲 channel

有缓冲 channel 创建时带容量：

```go
ch := make(chan string, 2)
```

它可以先放两个值：

```go
ch <- "A"
ch <- "B"
```

第三个值会阻塞，除非有人先取走一个：

```go
ch <- "C"
```

有缓冲 channel 像一个小队列。它能让发送方和接收方的节奏稍微错开。

比如流式输出：

```go
events := make(chan StreamEvent, 64)
```

模型返回事件可能很快，UI 渲染可能慢一点。给 64 个缓冲，生产者不用每发一个事件都立刻等消费者。

但缓冲不是无限的。消费者一直不读，缓冲满了以后，发送方照样会阻塞。

## 用 chan bool 做一把简单的锁

channel 也可以拿来做“锁”的效果。

比如用容量为 1 的 `chan bool`：

```go
lock := make(chan bool, 1)
```

加锁：

```go
lock <- true
```

解锁：

```go
<-lock
```

完整例子：

```go
func main() {
	lock := make(chan bool, 1)
	count := 0

	var wg sync.WaitGroup
	for i := 0; i < 1000; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			lock <- true
			count++
			<-lock
		}()
	}

	wg.Wait()
	fmt.Println(count)
}
```

为什么它像锁？

因为 `lock` 容量只有 1。第一个 goroutine 写入成功后，其他 goroutine 再执行：

```go
lock <- true
```

就会阻塞。只有前一个 goroutine 执行：

```go
<-lock
```

把位置让出来，下一个 goroutine 才能进去。

实际项目里，普通互斥优先用 `sync.Mutex`，表达更直接：

```go
var mu sync.Mutex
mu.Lock()
defer mu.Unlock()
```

`chan bool` 这种写法适合理解 channel 的阻塞机制，也适合做简单的并发限制。

## close

发送方可以关闭 channel：

```go
close(ch)
```

关闭不是删除 channel，而是告诉接收方：后面不会再有新数据了。

接收时可以拿到两个值：

```go
v, ok := <-ch
```

`ok == false` 表示 channel 已经关闭，并且没有剩余数据。

更常用的是 `for range`：

```go
for msg := range ch {
	fmt.Println(msg)
}
```

当 channel 关闭，并且里面的数据都读完，循环会结束。

发送方关闭，接收方不要关。

原因也简单：发送方才知道自己还会不会继续发。

重复关闭 channel 会 panic：

```go
close(ch)
close(ch) // panic
```

## 单向 channel

函数参数可以限制 channel 方向。

只发送：

```go
func producer(out chan<- int) {
	out <- 1
}
```

只接收：

```go
func consumer(in <-chan int) {
	v := <-in
	fmt.Println(v)
}
```

这不是必须写，但写了以后意图更清楚。编译器也能帮你挡住一部分误用。

比如 `consumer` 里不能发送：

```go
in <- 1 // 编译不过
```

## select

`select` 用来同时等多个 channel。

```go
select {
case msg := <-ch:
	fmt.Println("message:", msg)
case <-time.After(time.Second):
	fmt.Println("timeout")
}
```

哪个 case 先准备好，就执行哪个。

如果都没准备好，`select` 会阻塞。

如果多个 case 同时准备好，Go 会随机选一个。

## default

加了 `default`，`select` 就不会阻塞。

```go
select {
case msg := <-ch:
	fmt.Println(msg)
default:
	fmt.Println("no message")
}
```

如果 `ch` 没数据，直接走 `default`。

这个适合“试一下”的场景。不要为了看起来完整就乱加 default。很多时候，我们就是希望 goroutine 等在那里。

## context.Done

`context.Context` 常用来通知取消。

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel()
```

调用：

```go
cancel()
```

之后，`ctx.Done()` 会关闭。

所以可以这么写：

```go
select {
case <-ctx.Done():
	return ctx.Err()
}
```

`ctx.Done()` 本质上也是一个 channel。我们从里面接收，不是为了拿数据，而是为了知道“该停了”。

## 用 channel 改写等待

假设有一个很慢的函数：

```go
func slow() string {
	time.Sleep(2 * time.Second)
	return "done"
}
```

直接调用会卡住：

```go
result := slow()
fmt.Println(result)
```

如果希望同时支持超时，可以把结果送进 channel：

```go
ch := make(chan string, 1)

go func() {
	ch <- slow()
}()

select {
case result := <-ch:
	fmt.Println(result)
case <-time.After(time.Second):
	fmt.Println("timeout")
}
```

这里后台 goroutine 等 `slow()`，主 goroutine 等两个信号：结果或超时。

## SSE 流式读取里的用法

LLM 流式响应里，经常会有类似：

```go
stream.Next()
```

它的意思是：等服务端发来下一条事件。

问题在于，它可能阻塞很久。服务端一直不发，或者连接静默挂住，它就不返回。

如果直接写：

```go
for stream.Next() {
	// 处理事件
}
```

一旦 `stream.Next()` 卡住，当前 goroutine 就没机会处理取消和超时。

所以可以这样拆：

```go
readNext := func() {
	nextCh <- sseResult{
		hasNext: stream.Next(),
	}
}

go readNext()
```

后台 goroutine 负责卡在 `stream.Next()`。

主 goroutine 用 `select`：

```go
select {
case <-ctx.Done():
	return ctx.Err()
case <-idle.C:
	return errors.New("stream timeout")
case res := <-nextCh:
	_ = res
}
```

这样主 goroutine 同时等三件事：

- 用户取消
- 空闲超时
- 下一条事件到了

收到一次 `nextCh` 的结果后，再启动下一次读取：

```go
go readNext()
```

注意不是一次开很多个 `readNext`。同一个 stream 通常应该一个一个读，否则顺序会乱，SDK 内部也未必支持并发读。

## 记法

channel 代码先问四个问题：

- 谁发？
- 谁收？
- 谁关？
- 满了或空了会不会卡住？

`select` 代码再问两个问题：

- 我是不是要同时等多个信号？
- 要不要支持取消或超时？

把这几个问题想清楚，channel 就不会只是背语法了。

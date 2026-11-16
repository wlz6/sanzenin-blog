---
title: Go 并发与 goroutine
published: 2026-08-01
description: Go 里启动并发任务很轻： 这行代码表示：新开一个 goroutine 去跑 work()，当前函数继续往下走。 这两个词很容易混。 并发是：一段时间内，多个任务都在推进。 并行是：同一时刻，多个任务真的同时跑。 单核 CPU 也可以并发。它可以先跑一点任务 A，再跑一点任务 B，来回切换。 多核 CPU 才能并行。任
image: ""
tags:
  - Go
  - Go全栈开发
  - 并发
  - goroutine
  - GO全栈开发
  - Obsidian
category: GO全栈开发
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# Go 并发与 goroutine

Go 里启动并发任务很轻：

```go
go work()
```

这行代码表示：新开一个 goroutine 去跑 `work()`，当前函数继续往下走。

## 并发和并行

这两个词很容易混。

并发是：一段时间内，多个任务都在推进。

并行是：同一时刻，多个任务真的同时跑。

单核 CPU 也可以并发。它可以先跑一点任务 A，再跑一点任务 B，来回切换。

多核 CPU 才能并行。任务 A 在一个核心上跑，任务 B 在另一个核心上跑。

Go 代码里写 goroutine，表达的是并发。至于最后有没有并行，要看机器核心数、Go runtime 调度、任务是否阻塞等因素。

## goroutine 和线程

可以先粗略这么理解：

```text
线程：操作系统调度，创建和切换成本更高
goroutine：Go runtime 调度，创建和切换成本更低
```

goroutine 不是系统线程本身。Go runtime 会把很多 goroutine 安排到少量系统线程上执行。

所以你可以比较大胆地开 goroutine：

```go
for i := 0; i < 1000; i++ {
	go func(id int) {
		fmt.Println(id)
	}(i)
}
```

这不是说 goroutine 可以无限开。它也占内存，也会增加调度成本。只是相比系统线程，它轻很多。

## 普通调用和 go 调用

普通函数调用会等待函数执行完：

```go
func main() {
	work()
	fmt.Println("done")
}
```

`work()` 不结束，`done` 不会打印。

加上 `go`：

```go
func main() {
	go work()
	fmt.Println("done")
}
```

`main` 不等 `work()`，它会继续往下执行。

所以这类代码不能假设输出顺序。多个 goroutine 同时跑时，谁先执行、谁后执行，都不稳定。

## main 结束，程序就结束

很多新手第一次写 goroutine 会遇到这个问题：

```go
func main() {
	go fmt.Println("hello")
}
```

可能什么都不输出。

原因是 `main` 函数结束后，整个程序就退出了。后台 goroutine 没有“自动保活”的待遇。

如果要等它执行完，需要同步。

## WaitGroup

`sync.WaitGroup` 用来等待一组 goroutine 结束。

```go
func main() {
	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()
		fmt.Println("hello")
	}()

	wg.Wait()
}
```

这三个方法经常一起出现：

```go
wg.Add(1)  // 多了一个任务
wg.Done()  // 这个任务完成了
wg.Wait()  // 等所有任务完成
```

多个任务：

```go
func main() {
	var wg sync.WaitGroup

	for i := 1; i <= 3; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			fmt.Println("worker", id)
		}(i)
	}

	wg.Wait()
	fmt.Println("all done")
}
```

注意这里把 `i` 作为参数传进匿名函数：

```go
go func(id int) {
	// ...
}(i)
```

这样每个 goroutine 拿到的是当次循环的值，代码也更清楚。

## 限制最大并行数

`WaitGroup` 只能等 goroutine 结束，它本身不能限制同时跑多少个。

如果想“最多同时跑 3 个任务”，常见写法是 `WaitGroup` 配合带缓冲 channel。

```go
func main() {
	var wg sync.WaitGroup
	limit := make(chan bool, 3)

	for i := 1; i <= 10; i++ {
		wg.Add(1)

		go func(id int) {
			defer wg.Done()

			limit <- true
			defer func() {
				<-limit
			}()

			fmt.Println("start", id)
			time.Sleep(time.Second)
			fmt.Println("done", id)
		}(i)
	}

	wg.Wait()
}
```

`limit` 的容量是 3，所以最多只有 3 个 goroutine 能成功写入：

```go
limit <- true
```

第 4 个会卡住，直到前面某个任务执行：

```go
<-limit
```

腾出一个位置。

这里 `WaitGroup` 负责等所有任务结束，`limit` 负责控制同时运行的数量。两个东西分工不同。

## goroutine 什么时候阻塞

goroutine 跑到需要等待的地方，就会阻塞。

常见阻塞点：

- 从 channel 接收，但没人发
- 往无缓冲 channel 发送，但没人收
- 往满的有缓冲 channel 发送
- 从空的有缓冲 channel 接收
- `select` 的所有 case 都没准备好
- 网络读取
- 文件读取
- 数据库查询
- `time.Sleep`

例子：

```go
func main() {
	ch := make(chan string)
	msg := <-ch
	fmt.Println(msg)
}
```

这里会一直等，因为没人往 `ch` 里发数据。

再看网络流式读取：

```go
stream.Next()
```

它是在等服务端发下一条数据。服务端迟迟不发，或者连接半死不活，这个调用就可能卡住。

阻塞的是当前 goroutine，不一定是整个程序。只要别的 goroutine 还在跑，程序就还能处理别的事。

## goroutine 和共享变量

并发代码里最容易出问题的是共享变量。

```go
count := 0

for i := 0; i < 1000; i++ {
	go func() {
		count++
	}()
}
```

这段代码有数据竞争。多个 goroutine 同时改 `count`，结果不可靠。

可以用锁：

```go
var mu sync.Mutex
count := 0

for i := 0; i < 1000; i++ {
	go func() {
		mu.Lock()
		defer mu.Unlock()
		count++
	}()
}
```

也可以用 channel，把修改集中到一个 goroutine 里。具体看 [Go Channel 与 select](/posts/obsidian/go-channel-%E4%B8%8E-select/)。

## goroutine 里的 panic

goroutine 里 panic，如果这个 goroutine 自己没有 recover，程序会崩。

外层 goroutine 捕不到它。

```go
go func() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("recover:", r)
		}
	}()

	work()
}()
```

写后台任务时，可以在 goroutine 的入口放一个 recover。这样至少能记录错误，不至于整个程序直接退出。

## 放到 code agent 里看

一个 code agent 调模型时，经常要处理流式输出。

`stream.Next()` 可能阻塞，所以可以让后台 goroutine 去等：

```go
readNext := func() {
	nextCh <- stream.Next()
}

go readNext()
```

主 goroutine 不直接卡在 `stream.Next()`，它还可以同时处理取消和超时。

这就是 goroutine 在这种场景里的用法：把可能等待很久的工作放到后台，主流程保留控制权。

## 记法

启动 goroutine 很容易，难的是后面几个问题：

- 它什么时候结束？
- main 要不要等它？
- 它阻塞了怎么办？
- 它 panic 了谁处理？
- 它和别的 goroutine 怎么传数据？

这些想清楚，并发代码就不会乱成一团。

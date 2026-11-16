---
title: Go panic 和 recover
published: 2026-08-01
description: Go 平时处理错误主要用 error，不是用 panic。 比如文件不存在、请求失败、参数不合法，这些都应该返回错误： panic 更像是程序说：“这个状态我没法继续了。” 手动触发 panic： 程序会停止当前的正常执行流程，然后打印调用栈。 常见 panic： - 切片越界 - 空指针 - 类型断言失败 - 重复关
image: ""
tags:
  - Go
  - Go全栈开发
  - panic
  - recover
  - GO全栈开发
  - Obsidian
category: GO全栈开发
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# Go panic 和 recover

Go 平时处理错误主要用 `error`，不是用 `panic`。

比如文件不存在、请求失败、参数不合法，这些都应该返回错误：

```go
func loadConfig(path string) error {
	if path == "" {
		return errors.New("empty path")
	}
	return nil
}
```

`panic` 更像是程序说：“这个状态我没法继续了。”

## panic 会发生什么

手动触发 panic：

```go
func main() {
	panic("boom")
}
```

程序会停止当前的正常执行流程，然后打印调用栈。

常见 panic：

- 切片越界
- 空指针
- 类型断言失败
- 重复关闭 channel
- 手动 `panic`

例子：

```go
nums := []int{1, 2, 3}
fmt.Println(nums[10])
```

下标越界，程序会 panic。

## panic 时 defer 仍然会执行

这一点很重要。panic 发生后，当前函数里已经登记的 defer 会继续执行。

```go
func main() {
	defer fmt.Println("cleanup")
	panic("boom")
}
```

输出里会先看到：

```text
cleanup
```

然后程序再崩。

这也是为什么释放资源适合用 defer。就算中途 panic，清理代码仍然有机会跑。

panic 会沿着调用栈往上传：

```go
func a() {
	defer fmt.Println("defer a")
	b()
}

func b() {
	defer fmt.Println("defer b")
	panic("boom")
}
```

调用 `a()` 后，会先执行 `b` 的 defer，再执行 `a` 的 defer。一路没人处理，程序最后退出。

## recover 怎么用

`recover` 可以把 panic 接住，让程序恢复。

但它必须写在 defer 函数里才有效：

```go
func main() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("recovered:", r)
		}
	}()

	panic("boom")
}
```

输出：

```text
recovered: boom
```

这样程序不会继续崩。

下面这种没用：

```go
func main() {
	recover()
	panic("boom")
}
```

因为调用 `recover()` 时，还没有正在处理的 panic。

还有一个点容易漏：`recover` 不只接当前函数里直接写的 `panic`。只要 panic 是在这个 defer 登记之后、同一个 goroutine 的调用链里发生的，它也能接住。

```go
func main() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("recovered:", r)
		}
	}()

	run()
}

func run() {
	step1()
}

func step1() {
	panic("boom in step1")
}
```

这里 `panic` 是在 `step1()` 里发生的，但调用链是：

```text
main -> run -> step1
```

`main` 里提前登记好的 defer 仍然会在 panic 往上传的时候执行，所以能 recover 到这个 panic。

## recover 放在哪里合适

不要在普通业务逻辑里到处 recover。那样很容易把 bug 吞掉，最后只剩下一堆“不知道为什么不对”的状态。

比较合适的位置是边界：

- HTTP 请求入口
- goroutine 启动处
- 命令行程序最外层
- 框架调用用户代码的地方

比如 HTTP 中间件：

```go
func recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				http.Error(w, "internal server error", 500)
			}
		}()

		next.ServeHTTP(w, r)
	})
}
```

它不是鼓励里面的业务随便 panic，而是防止一个请求把整个服务进程带崩。

## goroutine 里的 panic

goroutine 里的 panic，要在同一个 goroutine 里 recover。

外层捕不到：

```go
func main() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("main recover:", r)
		}
	}()

	go func() {
		panic("boom")
	}()

	time.Sleep(time.Second)
}
```

main 里的 recover 不会接住子 goroutine 的 panic。

应该这样：

```go
go func() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("worker recover:", r)
		}
	}()

	panic("boom")
}()
```

写后台任务、任务池、agent 工具执行器时，这一点很实用。只要你启动了 goroutine，就要想一下：它里面如果 panic，谁负责兜住。

## 什么时候用 panic

适合 panic：

- 初始化时配置缺失，程序无法启动
- 代码走到了理论上不该出现的分支
- 内部状态被破坏，继续跑只会更乱

不适合 panic：

- 用户输入错了
- 文件不存在
- 网络失败
- 模型接口返回错误
- JSON 解析失败

这些更适合返回 `error`，交给调用方决定怎么处理。

## 记法

`panic` 是异常退出。

`defer` 会在 panic 展开时执行。

`recover` 只能在 defer 函数里接住 panic。

goroutine 里的 panic 不会被其他 goroutine 的 recover 接住。

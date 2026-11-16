---
title: Linux 应用程序链接与加载：从 C 源码到进程的完整链路
published: 2026-08-23
description: 本章目标：理解一个 C 程序为什么能够运行。 从： 到： 中间经历了什么？ 重点掌握： - 编译（compile） - 链接（link） - ELF 文件格式 - 静态链接 - 动态链接 - PLT/GOT - ld.so - execve 加载过程 - 常用二进制分析工具 写一个程序： 执行： 表面看： 实际上： 作
image: ""
tags:
  - 操作系统
  - Obsidian
category: 操作系统
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# Linux 应用程序链接与加载：从 C 源码到进程的完整链路

> 本章目标：理解一个 C 程序为什么能够运行。
>
> 从：
>
> ```
> hello.c
> ```
>
> 到：
>
> ```
> CPU执行指令
> ```
>
> 中间经历了什么？
>
> 重点掌握：
>
> - 编译（compile）
> - 链接（link）
> - ELF 文件格式
> - 静态链接
> - 动态链接
> - PLT/GOT
> - ld.so
> - execve 加载过程
> - 常用二进制分析工具

---

# 1. 程序运行的完整流程

写一个程序：

```
#include <stdio.h>

int main()
{
    puts("hello");
    return 0;
}
```

执行：

```
gcc hello.c -o hello
./hello
```

表面看：

```
hello.c
    |
    v
hello
    |
    v
运行
```

实际上：

```
hello.c

   |
   | compiler
   v

hello.o

   |
   | linker
   v

hello (ELF)

   |
   | execve()

   v

Linux kernel

   |
   | loader

   v

进程地址空间

   |
   | CPU执行

   v

main()
```

---

# 2. 三个核心角色

## 2.1 Compiler（编译器）

作用：

```
C代码 → 汇编 → 目标文件
```

例如：

```
gcc -c hello.c
```

生成：

```
hello.o
```

---

## 2.2 Linker（链接器）

作用：

把多个目标文件组合。

例如：

```
main.o

+

foo.o

↓

program
```

解决两个问题：

---

## 符号解析（Symbol Resolution）

例如：

main.c：

```
foo();
```

但是：

foo 在：

```
foo.c
```

里面。

linker 找到：

```
foo在哪里
```

---

## 重定位（Relocation）

修改：

```
call ????
```

成为：

```
call 真实地址
```

---

## 2.3 Loader（加载器）

作用：

把 ELF 文件放入内存。

负责：

- 创建地址空间
- 加载代码段
- 创建栈
- 设置寄存器
- 跳转入口地址

---

# 3. ELF：Linux可执行文件格式

Linux使用：

```
ELF
Executable and Linkable Format
```

查看：

```
file hello
```

例如：

输出：

```
hello: ELF 64-bit LSB executable
```

---

ELF 不只是可执行文件：

包括：

|类型|说明|
|---|---|
|.o|目标文件|
|可执行文件|程序|
|.so|共享库|
|core|崩溃转储|

---

# 4. ELF结构

大致：

```
ELF

+----------------+
| ELF Header     |
+----------------+
| Program Header |
+----------------+
| .text          |
| .rodata        |
| .data          |
| .bss           |
+----------------+
| Section Header |
+----------------+
```

---

# 5. Section 和 Segment

这是 ELF 最重要概念之一。

---

# 5.1 Section

面向：

```
linker
```

链接器关心：

> 哪些东西需要合并？

常见：

|Section|作用|
|---|---|
|.text|代码|
|.rodata|只读数据|
|.data|初始化全局变量|
|.bss|未初始化全局变量|
|.symtab|符号表|

---

# 5.2 Segment

面向：

```
loader
```

加载器关心：

> 哪些内容需要映射到内存？

例如：

```
LOAD

R-X

RW-
```

---

关系：

```
Section
    |
    | linker视角

Segment
    |
    | loader视角
```

---

# 6. 程序加载后的地址空间

一个进程：

```
高地址

+----------------+
| stack          |
+----------------+

+----------------+
| shared library |
| libc.so        |
+----------------+

+----------------+
| mmap           |
+----------------+

+----------------+
| heap           |
+----------------+

+----------------+
| .bss/.data     |
+----------------+

+----------------+
| .text          |
+----------------+

低地址
```

---

对应 C：

|C代码|位置|
|---|---|
|函数|.text|
|字符串常量|.rodata|
|global变量|.data/.bss|
|malloc|heap|
|局部变量|stack|

---

# 7. 静态链接

## 思想

把库代码直接复制进程序。

例如：

```
printf()
```

来自：

```
libc.a
```

静态链接：

```
hello.o

+

libc.a

↓

hello
```

最终：

```
hello

.text

main

printf

malloc

...
```

---

## 优点

运行时不依赖外部库。

## 缺点

### 1. 文件大

### 2. 内存浪费

例如：

```
程序A libc

程序B libc

程序C libc
```

---

# 8. 动态链接

解决静态链接问题。

思想：

共享库。

结构：

```
vim

 |
 |
 libc.so


bash

 |
 |
 libc.so
```

多个程序共享：

```
libc.so
```

---

# 9. 动态链接的问题

代码：

```
puts("hello");
```

但是：

puts在哪里？

答案：

```
libc.so
```

编译 hello 时：

不知道：

```
libc加载在哪里
```

因为：

- ASLR
- 动态库地址随机

---

解决：

```
PLT + GOT
```

---

# 10. GOT

## Global Offset Table

全局偏移表。

本质：

一个地址表。

例如：

```
GOT

+-------------+
| puts地址    |
+-------------+
| malloc地址  |
+-------------+
| printf地址  |
+-------------+
```

启动前：

```
puts = ?
```

动态链接后：

```
puts = 0x7ffff7xxxx
```

---

# 11. PLT

## Procedure Linkage Table

函数跳板。

调用：

```
puts();
```

实际：

```
call puts@plt
```

流程：

```
main

 |
 |
puts@plt

 |
 |
GOT

 |
 |
libc puts
```

---

# 12. 第一次调用 puts

流程：

```
main

call puts@plt

        |

        v

      PLT

        |

        v

      GOT

        |

        v

      ld.so

        |

        v

    查找 libc

        |

        v

    修改 GOT
```

之后：

```
main

↓

PLT

↓

GOT

↓

puts
```

这叫：

## Lazy Binding

延迟绑定。

---

# 13. ld.so

动态链接器。

文件：

```
/lib64/ld-linux-x86-64.so.2
```

查看：

```
ls -l /lib64/ld-linux-x86-64.so.2
```

---

作用：

## 1. 加载共享库

例如：

```
libc.so
libm.so
```

---

## 2. 符号解析

找到：

```
puts在哪里
```

---

## 3. 修改GOT

填入：

```
真实地址
```

---

# 14. 程序启动流程

执行：

```
./hello
```

真实：

```
shell

 |
 |
execve()

 |
 v

kernel

 |
 |
读取ELF

 |
 |
发现.interp

 |
 |
启动ld.so

 |
 |
加载libc.so

 |
 |
修改GOT

 |
 |
_start

 |
 |
__libc_start_main

 |
 |
main
```

---

# 15. 为什么不是main开始执行？

查看：

```
readelf -h hello
```

看到：

```
Entry point address
```

通常：

```
_start
```

不是：

```
main
```

原因：

main之前需要：

- 初始化libc
- 设置argc argv
- 初始化环境
- 初始化全局变量

---

# 16. objdump：查看机器指令

命令：

```
objdump -d hello
```

作用：

反汇编。

例如：

C：

```
puts("hello");
```

汇编：

```
lea string,%rax

mov %rax,%rdi

call puts@plt
```

---

# 17. main函数解释

典型：

```
push rbp
mov rsp,rbp
```

建立栈帧。

---

加载字符串：

```
lea offset(%rip),%rax
```

原因：

PIE。

不能固定地址。

使用：

```
RIP + offset
```

---

参数传递：

Linux x86-64 ABI：

|参数|寄存器|
|---|---|
|1|rdi|
|2|rsi|
|3|rdx|
|4|rcx|
|5|r8|
|6|r9|

所以：

```
puts("hello")
```

变成：

```
rdi = hello地址
```

---

# 18. 常用命令总结

---

# 18.1 查看文件类型

```
file hello
```

作用：

查看是否 ELF。

---

# 18.2 查看 ELF Header

```
readelf -h hello
```

查看：

- ELF类型
- entry point

重点：

```
Entry point address
```

---

# 18.3 查看 Program Header

```
readelf -l hello
```

重点：

```
LOAD

INTERP

DYNAMIC
```

---

# 18.4 查看 Section

```
readelf -S hello
```

查看：

```
.text
.data
.bss
.rodata
```

---

# 18.5 查看动态依赖

```
ldd hello
```

例如：

```
libc.so.6

libm.so.6

ld-linux
```

---

# 18.6 查看汇编

```
objdump -d hello
```

查看：

```
_start

main

PLT
```

---

# 18.7 C代码和汇编对应

编译：

```
gcc -g hello.c -o hello
```

查看：

```
objdump -S hello
```

---

# 18.8 查看符号表

```
nm hello
```

动态符号：

```
nm -D hello
```

例如：

```
U puts
```

表示：

undefined。

---

# 18.9 查看重定位

```
objdump -R hello
```

查看：

```
JUMP_SLOT puts
```

---

# 18.10 查看运行时地址空间

启动：

```
./hello
```

查 PID：

```
ps aux
```

查看：

```
pmap PID
```

或者：

```
cat /proc/PID/maps
```

---

# 19. LD_PRELOAD

作用：

强制加载自己的动态库。

例如：

```
LD_PRELOAD=./hook.so ./hello
```

可以：

- 替换函数
- 监控调用
- 调试

---

# 20. 总结：完整知识链

```
C源码

↓

gcc

↓

.o目标文件

↓

linker

↓

ELF

↓

execve

↓

kernel

↓

loader

↓

ld.so

↓

加载动态库

↓

解析符号

↓

修改GOT

↓

_start

↓

libc初始化

↓

main

↓

PLT

↓

GOT

↓

libc函数
```

---

# 最终需要掌握的核心概念

|概念|一句话|
|---|---|
|ELF|描述程序如何运行的文件格式|
|Section|链接器看到的组织方式|
|Segment|加载器看到的组织方式|
|Linker|生成最终程序|
|Loader|把程序放入内存|
|ld.so|动态加载和链接|
|PLT|函数调用跳板|
|GOT|保存真实地址|
|Relocation|修正地址|
|Lazy Binding|第一次调用时解析|

---

这一章学完以后，后面的：

- shell 为什么能执行程序
- execve 如何工作
- fork 为什么复制地址空间
- mmap 为什么能加载共享库
- 调试器如何找到函数

都会建立在这套模型上。你现在用 `pmap + readelf + objdump + ldd` 这几个工具观察程序，已经是在用 Linux 系统程序员的视角理解 OS 了。

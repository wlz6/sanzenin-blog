---
title: cpu_scheduling
published: 2026-07-14
description: when a program is executed, it becomes a process and the operating system reserves a memory block for it. within this block, there's a memory segment called the
image: /obsidian/cpu_scheduling-1784049668912.webp
tags:
  - 操作系统
  - Obsidian
category: 操作系统
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

![cpu_scheduling-1784049668912](/obsidian/cpu_scheduling-1784049668912.webp)
![cpu_scheduling-1784049815339](/obsidian/cpu_scheduling-1784049815339.webp)
when a program is executed, it becomes a process and the operating system reserves a memory block for it. within this block, there's a memory segment called the text section which contains the executable code for the program.
![cpu_scheduling-1784049895199](/obsidian/cpu_scheduling-1784049895199.webp)
	we know that the cpu contains a special register called the address register, also known as the program counter. this register points to the next instruction to be executed.
![cpu_scheduling-1784050437099](/obsidian/cpu_scheduling-1784050437099.webp)
but remember that what enters the queue isn't actually a process, but its process control block.

but many applications such as servers or background services are designed to run indefinitely. if we allocate the cpu to a process that never ends, all subsequent processes would be indefinitely waiting in the queue. if we assume that a process can only get the cpu  fact is that programs in execution don't use the cpu continuously.

eventually the final cpu burst ends with a system request to terminate execution.
![cpu_scheduling-1784050656308](/obsidian/cpu_scheduling-1784050656308.webp)
![cpu_scheduling-1784050697656](/obsidian/cpu_scheduling-1784050697656.webp)
the scheduler should allocate it only until the process's current cpu burst ends.
![cpu_scheduling-1784051033396](/obsidian/cpu_scheduling-1784051033396.webp)
so even though it is now ready to continue running, it must wait for its turn.for most of their lifetime, processes cycle between these three states: ready, running, and waiting.
![cpu_scheduling-1784051335794](/obsidian/cpu_scheduling-1784051335794.webp)
after making a system call to exit, the operating system must free allocated resources, including memory.
![cpu_scheduling-1784051506060](/obsidian/cpu_scheduling-1784051506060.webp)
dispatcher.when a running process enters an io waiting state and the cpu becomes available the dispatcher steps in with one single purpose.allocate the cpu to the process at the head of the ready q.
in other words, perform the context switch.

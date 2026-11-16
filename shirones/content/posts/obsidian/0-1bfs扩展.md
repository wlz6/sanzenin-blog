---
title: 0-1BFS扩展
published: 2026-09-03
description: 给定一张无向图，起点为 ，终点为 。每条边的权值表示经过该道路所需时间，题目语境下普通道路耗时为 ，若需要聊天则额外耗时 ，因此边权只会落在小整数集合 中。图中可能存在重边，要求输出从 到 的最短路长度。 数据范围为 ， 。若直接使用堆优化 Dijkstra，复杂度为 ，在该规模下常数和对数因子都较重；边权范围很小，应
image: ""
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# 0-1BFS扩展

## 题目重述

给定一张无向图，起点为 $1$，终点为 $t$。每条边的权值表示经过该道路所需时间，题目语境下普通道路耗时为 $1$，若需要聊天则额外耗时 $1$，因此边权只会落在小整数集合 $\{1,2\}$ 中。图中可能存在重边，要求输出从 $1$ 到 $t$ 的最短路长度。

数据范围为 $n \le 5\,000\,000$，$m \le 10\,000\,000$。若直接使用堆优化 Dijkstra，复杂度为 $O(m \log n)$，在该规模下常数和对数因子都较重；边权范围很小，应利用这一结构。

## 关键观察

0-1 BFS 适用于边权集合 $\{0,1\}$：当前点距离为 $d$，松弛后新距离只可能为 $d$ 或 $d+1$，因此用双端队列即可维持非降序出队。

本题边权集合为 $\{1,2\}$，松弛后新距离只可能为 $d+1$ 或 $d+2$。这不能直接等价为 0-1 BFS，因为把每条边权减去 $1$ 会使路径代价额外依赖边数，而不同路径的边数不一定相同。正确的推广方式是使用循环桶：维护 $3$ 个队列，队列编号为距离对 $3$ 取模的结果。

选择 $3$ 个桶的原因是最大边权为 $2$。当正在处理距离 $d$ 的点时，新产生的候选距离不会超过 $d+2$；在距离指针依次移动到 $d+1,d+2,d+3$ 前，编号为 $d \bmod 3$ 的桶已经被清空，可以重新存放距离为 $d+3$ 的点。因为所有边权均为正，已经弹出并确认的最小距离不会再被更小距离更新，所以每个点第一次被确认时即得到最短路。

## 解析

建图时使用链式前向星存储无向边。对于输入边 $(u,v,w)$，分别加入 $u \to v$ 和 $v \to u$。由于 $m$ 可达 $10^7$，链式前向星比 `vector<vector<...>>` 更容易控制内存。

设 `dis[x]` 表示当前已知的从 $1$ 到 $x$ 的最短距离，`vis[x]` 表示该点是否已经被确认。维护三个普通队列 `q[0]`、`q[1]`、`q[2]`，变量 `cur` 表示当前要处理的距离模 $3$ 的桶。初始令 `dis[1]=0`，将 $1$ 放入 `q[0]`。

每轮从 `q[cur]` 中取出当前批次的点。若点已经被确认，则跳过；否则标记为确认，并枚举其所有出边。对于边 $x \to v$，权值为 $w$，若

$$
\text{dis}[v] > \text{dis}[x] + w,
$$

则更新

$$
\text{dis}[v] = \text{dis}[x] + w,
$$

并将 $v$ 放入 `q[dis[v] % 3]`。

该过程是 Dial 算法在最大边权为 $2$ 时的特化形式，也可以看作 0-1 BFS 从两个优先级扩展到三个循环优先级。0-1 BFS 用“队首”和“队尾”区分距离 $d$ 与 $d+1$；本题用 $3$ 个桶区分当前窗口内的距离 $d,d+1,d+2$。由于边权不超过 $2$，任何从当前最小距离点松弛出的新状态都不会跳出这个窗口，因此循环桶始终能够按照距离非降序确认点。

代码中在弹出点后若发现 `x==t` 即返回。此时 `t` 是从当前最小距离桶中取出的点；根据上述非降序性质，之后不可能出现距离更小的 $t$，所以可以提前终止。

复杂度方面，每条边在端点被确认时被扫描一次，入队可能因松弛发生多次，但每次成功松弛对应一次距离下降，整体在小整数正权的桶式 Dijkstra 框架下为线性级实现。对于本题代码的常见分析，可记为 $O(n+m)$；存储图和辅助数组的空间复杂度为 $O(n+m)$。

## 代码

```cpp
#include <bits/stdc++.h>
#include <iomanip>
#define ll long long
#define N 10000005
#define pr pair<int, int>
using namespace std;
ll ans;
int n, m;
int t, cnt;
struct edge {
    int to, nxt, w;
} edges[N];
int head[N];
int main() {
    ios::sync_with_stdio(0);
    scanf("%d %d %d", &n, &m, &t);
    memset(head, -1, sizeof head);
    auto add = [&](int a, int b, int c) {
        cnt++;
        edges[cnt] = {b, head[a], c};
        head[a] = cnt;
    };
    for (int i = 1; i <= m; i++) {
        int a, b, c;
        // cin>>a>>b>>c;
        scanf("%d %d %d", &a, &b, &c);
        add(a, b, c);
        add(b, a, c);
    }
    vector<int> dis(n + 5, 1e9);
    vector<bool> vis(n + 5, 0);
    auto bfs = [&]() {
        queue<int> q[3];
        q[0].push(1);
        dis[1] = 0;
        int cur = 0;
        while (q[0].size() || q[1].size() || q[2].size()) {
            int siz = q[cur].size();
            for (int i = 1; i <= siz; i++) {
                auto x = q[cur].front();
                q[cur].pop();
                if (x == t)
                    return;
                if (vis[x])
                    continue;
                vis[x] = 1;
                for (int i = head[x]; ~i; i = edges[i].nxt) {
                    int v = edges[i].to, w = edges[i].w;
                    if (dis[v] > dis[x] + w) {
                        dis[v] = dis[x] + w;
                        q[dis[v] % 3].push(v);
                    }
                }
            }
            cur = (cur + 1) % 3;
        }
    };
    bfs();
    cout << dis[t];
    return 0;
}
```

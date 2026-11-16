---
title: Kruskal 重构树
published: 2026-07-19
description: Kruskal 重构树用于处理和边权限制有关的连通性问题。它保留了 Kruskal 合并连通块的过程，把“两个点在什么边权下连通”转化成树上的 LCA。 初始时，原图中的 个点就是重构树的 个叶子，编号为 。用并查集维护当前的连通块。 将原图中的边按题目需要排序，然后依次处理。对于一条边 ： 1. 找到 当前所在连通块
image: ""
tags:
  - 算法
  - 图论
  - Kruskal
  - ACM
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# Kruskal 重构树

Kruskal 重构树用于处理和边权限制有关的连通性问题。它保留了 Kruskal 合并连通块的过程，把“两个点在什么边权下连通”转化成树上的 LCA。

## 构造

初始时，原图中的 $n$ 个点就是重构树的 $n$ 个叶子，编号为 $1\sim n$。用并查集维护当前的连通块。

将原图中的边按题目需要排序，然后依次处理。对于一条边 $(u,v,w)$：

1. 找到 $u,v$ 当前所在连通块的根 $r_u,r_v$。
2. 如果 $r_u=r_v$，说明两个连通块已经合并，跳过这条边。
3. 否则新建节点 $p$，令 $val[p]=w$。
4. 将 $r_u,r_v$ 设为 $p$ 的两个儿子。
5. 在并查集中令 $r_u,r_v$ 的父亲都指向 $p$，由 $p$ 代表合并后的新连通块。

核心代码只有下面几行：

```cpp
int tot = n;
for (auto [w, u, v] : edges) {
    int ru = find(u);
    int rv = find(v);
    if (ru == rv)
        continue;
    ++tot;
    val[tot] = w;
    pa[tot] = tot;
    pa[ru] = pa[rv] = tot;
    son[tot].push_back(ru);
    son[tot].push_back(rv);
}
```

每次有效合并都会减少一个连通块，因此最多发生 $n-1$ 次合并。重构树最多有：

$$
n+(n-1)=2n-1
$$

个节点。

如果原图连通，最后新建的节点就是整棵重构树的根；如果原图不连通，得到的是一片重构树森林。

## 性质

### 1. 原图节点都是叶子

编号 $1\sim n$ 的节点对应原图中的点。其余节点都由一次连通块合并产生，只表示合并过程，不是原图中的真实节点。

### 2. 每个新节点恰好有两个儿子

一次有效合并连接两个不同的连通块，因此每个新节点都有两个儿子。若原图连通，最终得到一棵有 $n$ 个叶子的二叉树。

### 3. 一棵子树对应一个连通块

新节点 $p$ 的子树中，包含的正是这次合并后连通块内的所有原图节点。于是判断两个点何时进入同一个连通块，就等价于寻找它们在重构树上的最近公共祖先。

### 4. LCA 的点权是两点第一次连通时的边权

设原图中两点 $u,v$ 的最近公共祖先为 $p$。在建立 $p$ 之前，$u,v$ 属于两个不同的连通块；建立 $p$ 时，这两个连通块第一次合并。

因此：

$$
val[\operatorname{LCA}(u,v)]
$$

就是 Kruskal 扫描过程中使 $u,v$ 第一次连通的那条边的边权。

### 5. 点权具有单调性

排序方向决定重构树上的点权单调性。

| 处理顺序 | 父节点与儿子的点权 | 对应问题 |
| --- | --- | --- |
| 边权从小到大 | 父节点点权不小于儿子 | 最大边权的最小值 |
| 边权从大到小 | 父节点点权不大于儿子 | 最小边权的最大值 |

边权从小到大时：

$$
\min_{P:u\leadsto v}\ \max_{e\in P}w_e
=val[\operatorname{LCA}(u,v)]
$$

边权从大到小时：

$$
\max_{P:u\leadsto v}\ \min_{e\in P}w_e
=val[\operatorname{LCA}(u,v)]
$$

前者可以理解为逐渐放宽允许经过的最大边权；后者可以理解为逐渐降低允许经过的最小边权。两点第一次连通时的阈值就是答案。

## LCA 与复杂度

重构树建好后，预处理每个节点的深度和倍增父亲。每次询问求原图两点在重构树上的 LCA，再读取 LCA 的点权即可。

- 边排序：$O(m\log m)$
- 并查集合并：$O(m\alpha(n))$
- LCA 预处理：$O(n\log n)$
- 单次询问：$O(\log n)$

总复杂度为：

$$
O(m\log m+n\log n+q\log n)
$$

新建节点时最好分开写：

```cpp
++tot;
pa[tot] = tot;
```

不要写成 `pa[++tot]=tot`。同一表达式中既修改又读取 `tot`，容易产生求值顺序问题。

---

## P1967 [NOIP 2013 提高组] 货车运输

[题目链接](https://www.luogu.com.cn/problem/P1967)

一条运输路线能承受的重量，由路径上限重最小的边决定。题目要求最大化这个最小值，因此将边按权值从大到小处理。

原图可能不连通。查询前先用并查集判断两点是否连通，不连通时输出 `-1`。

```cpp
#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m;
    cin >> n >> m;
    vector<tuple<int, int, int>> edges;
    for (int i = 0; i < m; ++i) {
        int u, v, w;
        cin >> u >> v >> w;
        edges.push_back({w, u, v});
    }
    sort(edges.begin(), edges.end(), greater<>());
    const int LOG = 21;
    int tot = n;
    vector<int> pa(2 * n + 5);
    vector<int> val(2 * n + 5);
    vector<int> dep(2 * n + 5);
    vector<array<int, LOG>> fa(2 * n + 5);
    vector<vector<int>> son(2 * n + 5);
    iota(pa.begin(), pa.end(), 0);
    auto find = [&](auto &&self, int x) -> int {
        return pa[x] == x ? x : pa[x] = self(self, pa[x]);
    };
    for (auto [w, u, v] : edges) {
        int ru = find(find, u);
        int rv = find(find, v);
        if (ru == rv)
            continue;
        ++tot;
        val[tot] = w;
        pa[tot] = tot;
        pa[ru] = pa[rv] = tot;
        son[tot].push_back(ru);
        son[tot].push_back(rv);
    }
    auto dfs = [&](auto &&self, int x, int father) -> void {
        dep[x] = dep[father] + 1;
        fa[x][0] = father;
        for (int i = 1; i < LOG; ++i)
            fa[x][i] = fa[fa[x][i - 1]][i - 1];
        for (int y : son[x])
            self(self, y, x);
    };
    for (int i = 1; i <= tot; ++i)
        if (pa[i] == i)
            dfs(dfs, i, 0);
    auto lca = [&](int x, int y) {
        if (dep[x] < dep[y])
            swap(x, y);
        for (int i = LOG - 1; i >= 0; --i)
            if (dep[fa[x][i]] >= dep[y])
                x = fa[x][i];
        if (x == y)
            return x;
        for (int i = LOG - 1; i >= 0; --i) {
            if (fa[x][i] != fa[y][i]) {
                x = fa[x][i];
                y = fa[y][i];
            }
        }
        return fa[x][0];
    };
    int q;
    cin >> q;
    while (q--) {
        int u, v;
        cin >> u >> v;
        if (find(find, u) != find(find, v))
            cout << -1 << '\n';
        else
            cout << val[lca(u, v)] << '\n';
    }
    return 0;
}
```

## U201076 [BZOJ 3732] Network

[题目链接](https://www.luogu.com.cn/problem/U201076)

题目要求最小化一条路径上的最大边权，因此将边按权值从小到大处理。两点在重构树上的 LCA 点权，就是它们之间的最小瓶颈。

```cpp
#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m, q;
    cin >> n >> m >> q;
    vector<tuple<ll, int, int>> edges;
    for (int i = 0; i < m; ++i) {
        int u, v;
        ll w;
        cin >> u >> v >> w;
        edges.push_back({w, u, v});
    }
    sort(edges.begin(), edges.end());
    const int LOG = 21;
    int tot = n;
    vector<int> pa(2 * n + 5);
    vector<ll> val(2 * n + 5);
    vector<int> dep(2 * n + 5);
    vector<array<int, LOG>> fa(2 * n + 5);
    vector<vector<int>> son(2 * n + 5);
    iota(pa.begin(), pa.end(), 0);
    auto find = [&](auto &&self, int x) -> int {
        return pa[x] == x ? x : pa[x] = self(self, pa[x]);
    };
    for (auto [w, u, v] : edges) {
        int ru = find(find, u);
        int rv = find(find, v);
        if (ru == rv)
            continue;
        ++tot;
        val[tot] = w;
        pa[tot] = tot;
        pa[ru] = pa[rv] = tot;
        son[tot].push_back(ru);
        son[tot].push_back(rv);
    }
    auto dfs = [&](auto &&self, int x, int father) -> void {
        dep[x] = dep[father] + 1;
        fa[x][0] = father;
        for (int i = 1; i < LOG; ++i)
            fa[x][i] = fa[fa[x][i - 1]][i - 1];
        for (int y : son[x])
            self(self, y, x);
    };
    for (int i = 1; i <= tot; ++i)
        if (pa[i] == i)
            dfs(dfs, i, 0);
    auto lca = [&](int x, int y) {
        if (dep[x] < dep[y])
            swap(x, y);
        for (int i = LOG - 1; i >= 0; --i)
            if (dep[fa[x][i]] >= dep[y])
                x = fa[x][i];
        if (x == y)
            return x;
        for (int i = LOG - 1; i >= 0; --i) {
            if (fa[x][i] != fa[y][i]) {
                x = fa[x][i];
                y = fa[y][i];
            }
        }
        return fa[x][0];
    };
    while (q--) {
        int u, v;
        cin >> u >> v;
        cout << val[lca(u, v)] << '\n';
    }
    return 0;
}
```

## 相关

- [并查集](/posts/obsidian/%E7%AE%97%E6%B3%95%E7%AB%9E%E8%B5%9B%E6%A8%A1%E6%9D%BF%E5%A4%A7%E5%85%A8/#5-2-并查集-disjoint-set-union)
- [最近公共祖先](/posts/obsidian/%E7%AE%97%E6%B3%95%E7%AB%9E%E8%B5%9B%E6%A8%A1%E6%9D%BF%E5%A4%A7%E5%85%A8/#5-8-最近公共祖先-lca-倍增实现)
- [最小生成树](/posts/obsidian/%E7%AE%97%E6%B3%95%E7%AB%9E%E8%B5%9B%E6%A8%A1%E6%9D%BF%E5%A4%A7%E5%85%A8/#5-5-最小生成树-kruskal)

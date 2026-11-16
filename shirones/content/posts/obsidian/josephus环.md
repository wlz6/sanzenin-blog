---
title: Josephus Problem II
published: 2026-11-16
description: 有 个孩子按编号 围成一圈。游戏不断进行：每次跳过 个仍在圈中的孩子，然后删除下一个孩子。要求输出所有孩子被删除的顺序。 约束为 ， 。由于 可能很大，不能逐个模拟跳过过程；由于删除次数为 ，也不能在普通数组中直接删除元素，否则总复杂度会达到 。 当前剩余孩子按编号升序排列，可视为一个动态序列。若上一轮删除的是当前序列
image: /obsidian/circle_step_1.png
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# Josephus Problem II

## 题目重述

有 $n$ 个孩子按编号 $1,2,\ldots,n$ 围成一圈。游戏不断进行：每次跳过 $k$ 个仍在圈中的孩子，然后删除下一个孩子。要求输出所有孩子被删除的顺序。

![样例第一轮删除](/obsidian/circle_step_1.png)

约束为 $1 \le n \le 2 \times 10^5$，$0 \le k \le 10^9$。由于 $k$ 可能很大，不能逐个模拟跳过过程；由于删除次数为 $n$，也不能在普通数组中直接删除元素，否则总复杂度会达到 $O(n^2)$。

## 关键观察

当前剩余孩子按编号升序排列，可视为一个动态序列。若上一轮删除的是当前序列中的下标 $id$，删除后其右侧元素会自动前移，因此下一轮的起点仍然是新的下标 $id$。于是下一次删除位置满足：

![相对下标压缩](/obsidian/relative_index_compression.png)

$$
id \leftarrow (id + k) \bmod \text{cur\_size}.
$$

这里的 $id$ 是当前存活序列中的 $0$ 基相对下标，不是孩子的真实编号。真实编号需要通过数据结构查询“当前第 $id+1$ 个存活孩子是谁”。

树状数组维护每个编号是否仍然存活。令存活为 $1$，删除为 $0$，则当前第 $p$ 个存活孩子等价于寻找最小位置 $x$，使得：

$$
\sum_{i=1}^{x} a_i \ge p.
$$

树状数组的倍增查询可以在 $O(\log n)$ 时间内完成该查找。

## 解析

树状数组数组 `s` 中，`s[x]` 保存以 $x$ 为右端点、长度为 $\operatorname{lowbit}(x)$ 的区间和：

$$
s[x] = \sum_{i=x-\operatorname{lowbit}(x)+1}^{x} a_i.
$$

![树状数组区间块](/obsidian/fenwick_blocks.png)

函数 `find_k(tol)` 的目标是找到第 `tol` 个存活孩子。它维护变量 `id`，含义是：当前已经确认前 `id` 个位置不足以包含目标，即：

$$
\operatorname{prefix}(id) < \text{原始 } tol.
$$

因此答案一定在 `id` 的右侧。

倍增时从不超过 $n$ 的最大二次幂开始，依次尝试 `step`。令：

```cpp
next = id + step;
```

![倍增试探区间](/obsidian/find_kth_blocks_visual.png)

若 `next <= n` 且 `s[next] < tol`，说明从 `id+1` 到 `next` 这一整块中的存活数量仍不足以包含目标，可以整块跳过，于是：

```cpp
tol -= s[next];
id = next;
```

关键是为什么 `s[next]` 正好表示右侧试探区间。倍增过程保持一个二进制对齐不变量：在当前 `step` 轮开始时，`id` 是 $2 \cdot step$ 的倍数。于是：

$$
next = id + step
$$

的最低位 $1$ 正好是 `step`，即：

$$
\operatorname{lowbit}(next) = step.
$$

所以 `s[next]` 覆盖的区间为：

$$
[next-step+1,next] = [id+1,next].
$$

这正是从当前边界向右试探的整块区间。

若 `s[next] >= tol`，说明目标已经落在该块内，不能跳过，只能缩小 `step` 继续定位。循环结束时，`id` 是最后一个满足前缀和仍小于目标的位置，因此答案是：

```cpp
return id + 1;
```


每轮删除过程为：

1. 用 $id=(id+k)\bmod \text{cur\_size}$ 得到当前存活序列中的删除下标；
2. 用 `find_k(id+1)` 将相对下标转换为真实编号；
3. 输出该编号，并通过 `add(res, -1)` 在树状数组中删除它。

每个孩子被删除一次，每次执行一次树状数组倍增查找和一次单点更新，时间复杂度为：

$$
O(n \log n).
$$

树状数组占用 $O(n)$ 空间。

## 代码

```cpp
#include <bits/extc++.h>
#include <bits/stdc++.h>
#define N 200005
#define ll long long
#define pr pair<ll, ll>
#define inf 100000000000
using namespace std;
ll n, m, k;
ll mod = 1e9 + 7;
int main() {
    ios::sync_with_stdio(0);
    cin.tie(nullptr);
    cout.tie(nullptr);
    cin >> n >> k;
#define lowbit(x) (x & -x)
    vector<int> s(n + 5, 0);
    auto add = [&](int x, int add) {
        for (int i = x; i <= n; i += lowbit(i)) {
            s[i] += add;
        }
    };
    for (int i = 1; i <= n; i++) {
        add(i, 1);
    }
    auto find_k = [&](ll tol) {
        ll step = 1LL << (63 - __builtin_clzll(n));
        ll id = 0;
        for (; step >= 1; step >>= 1) {
            ll next = id + step;
            if (next <= n && s[next] < tol) {
                tol -= s[next];
                id = next;
            }
        }
        return id + 1;
    };
    int id = 0;
    for (ll cur_size = n; cur_size >= 1; cur_size--) {
        id = (id + k) % cur_size;
        auto res = find_k(id + 1);
        cout << res << '\n';
        add(res, -1);
    }
    return 0;
}
```

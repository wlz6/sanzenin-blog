---
title: 2-SAT
published: 2026-09-03
description: 有 个布尔变量 ，另有 个需要满足的条件，每个条件的形式都是「 为 true / false 或 为 true / false」。比如「 为真或 为假」、「 为假或 为假」。 2-SAT 问题的目标是给每个变量赋值使得所有条件得到满足。 成立 或 成立，等价于：若 不成立，则 必成立；且 若 不成立，则 必成立。 注意
image: ""
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

有 $n$ 个布尔变量 $x_1 \sim x_n$，另有 $m$ 个需要满足的条件，每个条件的形式都是「$x_i$ 为 `true` / `false` 或 $x_j$ 为 `true` / `false`」。比如「$x_1$ 为真或 $x_3$ 为假」、「$x_7$ 为假或 $x_2$ 为假」。

2-SAT 问题的目标是给每个变量赋值使得所有条件得到满足。
### 算法流程
#### 1. 逻辑关系：把 或关系 转化为 蕴含关系

$$a \lor b \iff (\neg a \to b) \land (\neg b \to a)$$

*   $a$ 成立 或 $b$ 成立，等价于：若 $a$ 不成立，则 $b$ 必成立；且 若 $b$ 不成立，则 $a$ 必成立。
*   **注意：** 蕴含关系具有**传递性**：若 $a \to b \land b \to c$，则 $a \to c$。蕴含关系通常是不可逆的。

#### 2. 拆点建图

把每个变量看成点，把 $n$ 个点拆成 $2n$ 个点，即把 $x_i$ 拆成 $i$ 和 $i+n$：
*   $i$ 对应 $x_i = 1$
*   $i+n$ 对应 $x_i = 0$

建图就是连有向边，例如：$x_i = a \lor x_j = b$，其中 $a \in \{0, 1\}, b \in \{0, 1\}$。

*   蕴含关系 $\neg(x_i = a) \to x_j = b$ 可以表示为：从 $i + (!a) \times n$ 到 $j + b \times n$ 的有向边。
*   蕴含关系 $\neg(x_j = b) \to x_i = a$ 可以表示为：从 $j + (!b) \times n$ 到 $i + a \times n$ 的有向边。

#### 3. Tarjan 缩点

先跑 Tarjan 缩点，缩点后判断：

1.  **如果 $i$ 和 $i+n$ 在同一 SCC 里**（即在一个环内），那么显然**无解**。因为 $x_i$ 不能既取 0 又取 1。
2.  **否则**，$i$ 和 $i+n$ 可能在一条链上或无关，那么**一定存在可行解**。

### 如何构造答案?


#### 1. 核心构造规则
在完成 Tarjan 缩点并判定无解（即不存在 $x_i$ 与 $\neg x_i$ 在同一 SCC）后，变量的赋值规则为：
*   若 **`scc[x] < scc[not_x]`**，则令 **$x = \text{True}$**；
*   若 **`scc[x] > scc[not_x]`**，则令 **$x = \text{False}$**。

**关键背景：** Tarjan 算法得到的 SCC 编号是 **反拓扑序**。编号越小，在拓扑序中越靠后（越接近推导链的终点/汇点）。

---

#### 2. 为什么这样是对的
*   **推导性质：** 若存在推导 $A \to B$，则 $A$ 为真时 $B$ 必为真。
*   **拓扑逻辑：** 越靠近汇点（拓扑序后）的点，其约束越少。将汇点设为真，不会通过边传递“必须为真”的压力给其他点；而将源点（拓扑序前）设为真，会引发连锁反应。
*   **对称性：** 蕴含图是对称的。如果 $x$ 在拓扑序后端，其否定点 $\neg x$ 必然在拓扑序前端。

---

#### 3. 正确性证明（反证法）
**目标：** 证明对于任意边 $u \to v$，不存在 $u = \text{True}$ 且 $v = \text{False}$ 的情况。

**证明过程：**
1.  **前提条件：**
    *   有向边 $u \to v \implies$ 图中必有逆否边 $\neg v \to \neg u$。
    *   根据 Tarjan 序性质：`scc[u] >= scc[v]` 且 `scc[not_v] >= scc[not_u]`。
2.  **假设冲突发生：**
    *   $u = \text{True} \implies$ `scc[u] < scc[not_u]`
    *   $v = \text{False} \implies$ `scc[not_v] < scc[v]`
3.  **链条推导：**
    将上述四个不等式连立：
    $$scc[u] < scc[not_u] \le scc[not_v] < scc[v] \le scc[u]$$
4.  **结论：**
    推导出 $scc[u] < scc[u]$，矛盾。因此，该赋值规则下逻辑恒自洽。

---

#### 4. 有点难理解的地方

#### Q1：路径 $x \to \neg x$ 为什么不导致矛盾？
*   **误区：** 认为存在路径就会矛盾。
*   **真相：** 只有 **环** ($x \leftrightarrow \neg x$) 才矛盾。
    *   $x \to \neg x$ 仅表示一种**强约束**：若 $x$ 为真则产生矛盾，所以 **$x$ 只能取假**。
    *   在算法中，$\neg x$ 在 $x$ 的下游，`scc[not_x]` 较小，规则会正确地将 $\neg x$ 设为真，即 $x$ 设为假。

#### Q2：假设 $a, b$ 都为真，但存在 $b \to \neg a$，怎么办？
*   **真相：** 这种情况**在数学上不存在**。
    *   如果 $b \to \neg a$，那么在全局拓扑序中，$b$ 必须排在 $\neg a$ 的前面。
    *   如果你选了 $a$ 为真（即 $\neg a$ 为假），那么根据推导链，$b$ 必须也被迫为假。
    *   算法通过 `scc` 编号的大小关系，强制保证了这种全局序。如果 $a, b$ 都被赋为真，它们之间的所有路径（包括 $b \to \neg a$）都不会违背逻辑。

---
### 常见命题约束的建图方式

2-SAT 建图的核心是把题面条件翻译成蕴含关系。对任意蕴含 $P\to Q$，需要同时加入其逆否命题 $\neg Q\to\neg P$。原因是二者在命题逻辑中等价：若 $P$ 成立时 $Q$ 必须成立，那么当 $Q$ 不成立时，$P$ 也不可能成立。

蕴含 $P\to Q$ 的实际含义是“禁止 $P$ 为真且 $Q$ 为假”。当前提 $P$ 为假时，该限制没有被触发，所以 $P=false,Q=true$ 是合法的。这也是一般的 $P\to Q$ 不能直接用并查集合并 $P$ 与 $Q$ 的原因：并查集合并表示 $P=Q$，会错误排除 $P=false,Q=true$。

常见建图模板如下：

| 约束 | 逻辑形式 | 建边 |
|---|---|---|
| $P$ 必须为真 | $\neg P\to P$ | 加 $\neg P\to P$ |
| $P$ 必须为假 | $P\to \neg P$ | 加 $P\to\neg P$ |
| $P\to Q$ | 蕴含 | 加 $P\to Q$ 与 $\neg Q\to\neg P$ |
| $P\lor Q$ | 至少一个为真 | 加 $\neg P\to Q$ 与 $\neg Q\to P$ |
| $P,Q$ 不能同时为真 | $\neg(P\land Q)$ | 加 $P\to\neg Q$ 与 $Q\to\neg P$ |
| $P,Q$ 必须相同 | $P\Leftrightarrow Q$ | 加 $P\to Q$、$Q\to P$，并补逆否 |
| $P,Q$ 必须不同 | $P\Leftrightarrow\neg Q$ | 加 $P\to\neg Q$、$Q\to\neg P$，并补逆否 |

若使用 $x$ 与 $x\oplus 1$ 表示互为否定的两个状态，可以把加边封装成：

```cpp
auto rev = [&](int x) { return x ^ 1; };
auto add_imp = [&](int u, int v) {
    g[u].push_back(v);
    g[rev(v)].push_back(rev(u));
};
```

其中 `add_imp(u, v)` 表示加入 $u\to v$，并自动补上 $\neg v\to\neg u$。

### 例题：公司搬迁

#### 题目重述

给定 $n$ 个互不相同的员工工号 $p_1,p_2,\ldots,p_n$，每名员工必须被分配到 $A$ 座或 $B$ 座。若工号为 $x$ 的员工在 $A$ 座，则工号为 $a-x$ 的员工也必须存在并在 $A$ 座；若工号为 $x$ 的员工在 $B$ 座，则工号为 $b-x$ 的员工也必须存在并在 $B$ 座。判断是否存在一种分配方案。

约束为 $1\le n\le 10^5$，$1\le p_i,a,b\le 10^9$，测试组数 $T\le 10$。

#### 关键观察

每名员工只有两种互斥状态，令

$$
A_i:\text{员工 }i\text{ 在 }A\text{ 座},\qquad B_i:\text{员工 }i\text{ 在 }B\text{ 座}.
$$

由于每名员工必须且只能选择一栋楼，$A_i$ 与 $B_i$ 互为否定命题。

若存在员工 $j$ 满足 $p_j=a-p_i$，则题意给出

$$
A_i\to A_j.
$$

若不存在这样的员工，则 $A_i$ 这个状态不合法，等价于

$$
A_i\to B_i.
$$

$B$ 座约束同理。若存在员工 $j$ 满足 $p_j=b-p_i$，则

$$
B_i\to B_j,
$$

否则

$$
B_i\to A_i.
$$

因此本题可以直接按 2-SAT 建图并跑 SCC。

但本题还可以用并查集判断。原因在于函数 $f_a(x)=a-x$ 满足 $f_a(f_a(x))=x$。若 $p_j=a-p_i$ 存在，则遍历到 $i$ 时得到 $A_i\to A_j$，遍历到 $j$ 时又得到 $A_j\to A_i$，二者合起来是

$$
A_i\Leftrightarrow A_j.
$$

这已经不是一般 2-SAT 的单向约束，而是等价约束。等价关系可以用并查集合并维护。$B$ 座对应的函数 $f_b(x)=b-x$ 同样满足该性质。

#### 解析

标准 2-SAT 做法可以令

$$
\text{node}(A_i)=2i,\qquad \text{node}(B_i)=2i+1,
$$

且 $\text{rev}(x)=x\oplus 1$。按以下方式建图：

- 若 $a-p_i$ 存在且对应员工为 $j$，添加 $A_i\to A_j$；否则添加 $A_i\to B_i$。
- 若 $b-p_i$ 存在且对应员工为 $j$，添加 $B_i\to B_j$；否则添加 $B_i\to A_i$。

跑 SCC 后检查是否存在 $A_i$ 与 $B_i$ 同属一个强连通分量。

并查集做法利用“存在搭档时状态等价”的特殊性。若 $a-p_i$ 存在且对应员工为 $j$，合并：

$$
A_i=A_j,\qquad B_i=B_j.
$$

若 $b-p_i$ 存在且对应员工为 $j$，合并：

$$
B_i=B_j,\qquad A_i=A_j.
$$

若 $a-p_i$ 不存在，员工 $i$ 不能在 $A$ 座，即 $A_i$ 为假、$B_i$ 为真。引入两个特殊集合 $T$ 与 $F$ 表示状态被强制为真或假，则合并：

$$
A_i=F,\qquad B_i=T.
$$

若 $b-p_i$ 不存在，则合并：

$$
B_i=F,\qquad A_i=T.
$$

处理完所有约束后，若 $T$ 与 $F$ 被合并，说明某个状态被同时强制为真和假，无解。若存在某个员工满足 $A_i$ 与 $B_i$ 被合并，说明该员工被要求同时在两栋楼，也无解。否则存在可行方案。

使用哈希表存储工号到员工下标的映射，可以在均摊 $O(1)$ 时间内判断搭档是否存在。每个员工只进行常数次并查集合并与查询，单组复杂度为 $O(n\alpha(n))$，空间复杂度为 $O(n)$。

#### 代码

```cpp
#include <array>
#include <bits/extc++.h>
#include <bits/stdc++.h>
#include <cctype>
#include <functional>
#define ll long long
#define N 1005
using namespace std;
using namespace __gnu_pbds;
ll ans;
ll n, m, a, b;
ll t;
int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    cout.tie(0);
    cin >> t;
    while (t--) {
        auto solve = [&]() {
            cin >> n >> a >> b;
            vector<ll> s(n + 5, 0);
            unordered_map<ll, ll> id;
            for (int i = 1; i <= n; i++) {
                cin >> s[i];
                id[s[i]] = i;
            }
            auto toa = [&](int x) { return x * 2; };
            auto tob = [&](int x) { return x * 2 + 1; };
            auto rev = [&](int x) { return x ^ 1; };
            vector<int> fa(2 * n + 10, 0);
            for (int i = 1; i <= 2 * n + 4; i++)
                fa[i] = i;
            auto find = [&](auto &&self, int x) -> int {
                return fa[x] = (fa[x] == x ? fa[x] : self(self, fa[x]));
            };
            auto merge = [&](int x, int y) {
                auto rx = find(find, x);
                auto ry = find(find, y);
                if (rx == ry)
                    return;
                fa[rx] = ry;
            };
            auto add = [&](int x, int y) {
                merge(x, y);
                merge(rev(x), rev(y));
            };
#define F 2 * n + 2
#define T 2 * n + 3
            for (int i = 1; i <= n; i++) {
                if (id.count(a - s[i])) {
                    add(toa(i), toa(id[a - s[i]]));
                } else {
                    merge(toa(i), F);
                    merge(tob(i), T);
                }
                if (id.count(b - s[i])) {
                    add(tob(i), tob(id[b - s[i]]));
                } else {
                    merge(tob(i), F);
                    merge(toa(i), T);
                }
            }
            if (find(find, T) == find(find, F)) {
                cout << "NO\n";
                return;
            }
            for (int i = 1; i <= n; i++) {
                if (find(find, tob(i)) == find(find, toa(i))) {
                    cout << "NO\n";
                    return;
                }
            }
            cout << "YES\n";
        };
        solve();
    }
    return 0;
}
```

[CSES  Giant Pizza](https://cses.fi/problemset/task/1684)
*代码*
```cpp
#include <algorithm>
#include <bits/stdc++.h>
#include <iterator>
#include <queue>
#include <set>
#include <unordered_map>
#define N 100005
#define inf 0x3f3f3f3f3f3f3f3f
#define ll long long
#define pr pair<ll, ll>
using namespace std;
int n, m, q, ma, block;
vector<vector<int>> map1;
vector<ll> scc;
const ll mod = 1e9 + 7;
int main() {
    ios::sync_with_stdio(0);
    cin.tie(nullptr);
    cout.tie(nullptr);
    cin >> m >> n;
    map1.assign(2 * n + 5, {});
    scc.assign(2 * n + 5, 0);
    auto rev = [&](int x) { return x > n ? x - n : x + n; };
    for (int i = 1; i <= m; i++) {
        char op1, op2;
        ll a, b;
        cin >> op1 >> a >> op2 >> b;
        if (op1 == '-')
            a += n;
        if (op2 == '-')
            b += n;
        map1[rev(a)].push_back(b);
        map1[rev(b)].push_back(a);
    }
    vector<ll> dfn(2 * n + 5, 0);
    vector<ll> low(2 * n + 5, 0);
    int tim = 0;
    stack<int> sta;
    vector<bool> insta(2 * n + 5, 0);
    auto tarjan = [&](auto &&self, int x) -> void {
        dfn[x] = low[x] = ++tim;
        sta.push(x);
        insta[x] = 1;
        for (auto v : map1[x]) {
            if (!dfn[v]) {
                self(self, v);
                low[x] = min(low[x], low[v]);
            } else if (insta[v])
                low[x] = min(low[x], dfn[v]);
        }
        if (low[x] == dfn[x]) {
            int y = -1;
            block++;
            while (y != x) {
                y = sta.top(), sta.pop();
                insta[y] = 0;
                scc[y] = block;
            }
        }
    };
    for (int i = 1; i <= 2 * n; i++) {
        if (!dfn[i])
            tarjan(tarjan, i);
    }
    vector<bool> ans(n + 5, 0);
    for (int i = 1; i <= n; i++) {
        if (scc[i] == scc[i + n]) {
            cout << "IMPOSSIBLE";
            return 0;
        }
        if (scc[i] < scc[i + n]) {
            ans[i] = 1;
        }
    }
    for (int i = 1; i <= n; i++) {
        if (ans[i] == 1)
            cout << '+' << ' ';
        else
            cout << '-' << ' ';
    }
    return 0;
}
```

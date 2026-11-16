---
title: Miller-Rabin 素数判定算法整理
published: 2026-09-03
description: Miller-Rabin 素数判定算法是可以快速判定质数的一个概率性算法,时间复杂度约为 ,远远快于试除法的 Miller-Rabin 算法是费马小定理与二次探测定理的结合，通过寻找“非平凡平方根”来从概率上判定一个数是否为合数。 如果 是素数，对于任意整数 ( )，满足： 局限性：存在“卡迈克尔数”（伪素数），它们是
image: ""
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

Miller-Rabin 素数判定算法是可以快速判定质数的一个概率性算法,时间复杂度约为$O(klog(n))$,远远快于试除法的$O(\sqrt{n})$

# Miller-Rabin 素数判定算法整理

## 1. 核心原理
Miller-Rabin 算法是**费马小定理**与**二次探测定理**的结合，通过寻找“非平凡平方根”来从概率上判定一个数是否为合数。

### A. 费马小定理 (基础检测)
如果 $n$ 是素数，对于任意整数 $a$ ($1 < a < n$)，满足：
$$a^{n-1} \equiv 1 \pmod n$$
*   **局限性**：存在“卡迈克尔数”（伪素数），它们是合数但能通过此测试。

### B. 二次探测定理 (核心检测)
如果 $p$ 是素数，且 $x^2 \equiv 1 \pmod p$，则 $x$ 的解只有两种可能：
$$x \equiv 1 \pmod p \quad \text{或} \quad x \equiv p-1 \pmod p$$
*   **推论**：如果在模 $n$ 的运算中，发现了一个数 $x$，它的平方是 1，但它自己既不是 1 也不是 $n-1$，则 $n$ **必然是合数**。

---

## 2. 证明

**命题**：若存在 $x$ 满足 $x^2 \equiv 1 \pmod n$，且 $x \not\equiv \pm 1 \pmod n$，则 $n$ 为合数。

**证明步骤**：
1.  由 $x^2 \equiv 1 \pmod n$，移项得 $x^2 - 1 \equiv 0 \pmod n$。
2.  即 $n$ 整除 $(x-1)(x+1)$，记作 $n \mid (x-1)(x+1)$。
3.  根据**欧几里得引理 (Euclid's Lemma)**：
    *   如果 $n$ 是素数，它必须整除 $(x-1)$ 或者整除 $(x+1)$。
    *   即 $x \equiv 1 \pmod n$ 或 $x \equiv -1 \pmod n$。
4.  **反证**：
    *   如果我们发现 $x \not\equiv 1$ 且 $x \not\equiv n-1$（即 $-1$），说明 $n$ 虽然整除乘积，却无法整除任何一个因子。
    *   这违背了素数的性质（素数不可拆分）。
    *   **结论**：$n$ 必然是合数。

---

## 3. 算法流程

假设要判定奇数 $n$ 是否为素数。

### 第一步：拆解指数
将 $n-1$ 提取出所有的因子 2，表示为：
$$n - 1 = d \times 2^r$$
其中 $d$ 是奇数，$r$ 是非负整数。这一步是为了构建可以不断“开平方”的序列。

### 第二步：选取底数 (Witness)
选取一个（或多个）底数 $a$ ($1 < a < n$) 进行测试。
*   *注：在long long范围内 ($< 2^{64}$)，选取固定的 {2, 3, 5, 7,11,17,37} 这一组底数可实现百分百正确判定。*

### 第三步：序列测试 (针对每一个 $a$)
1.  **计算起点**：算出 $x = a^d \pmod n$。
2.  **初步判断**：
    *   如果 $x = 1$ 或 $x = n-1$，则该底数测试通过（可能是素数），跳过后续步骤。
3.  **平方探测循环**：
    *   重复执行 $r-1$ 次平方操作：$x \leftarrow x^2 \pmod n$。
    *   **在每次平方后检查**：
        *   若结果为 $n-1$：测试通过（找到了 -1），停止本轮，判定为“可能是素数”。
        *   若结果为 $1$：**判定为合数**（触发二次探测定理，发现了非平凡平方根）。
4.  **最终审判**：
    *   如果循环结束，$x$ 仍未变成 $n-1$，说明最终 $a^{n-1} \not\equiv 1 \pmod n$ 或者无法在最后一步前匹配到 -1。
    *   **判定为合数**。

### 模板题
[CSES  Next Prime](https://cses.fi/problemset/task/3396)
*代码*
```cpp
cin >> n;
auto mul = [&](ll a, ll b, ll mod) { return (ll)((__int128)a * b % mod); };
auto qp = [&](ll x, ll n, ll mod) {
    ll res = 1;
    while (n) {
        if (n & 1)
            res = mul(res, x, mod);
        x = mul(x, x, mod);
        n >>= 1;
    }
    return res;
};
auto MR = [&](ll x, ll d, ll r, ll p) -> bool {
    ll now = qp(p, d, x);
    for (int i = 0; i < r; i++) {
        ll tem = mul(now, now, x);
        if (tem == 1 && now != 1 && now != x - 1)
            return 0; // 最容易理解的写法 乘完变成1且原本不是1或-1
        now = tem;
    }
    return now == 1;
};
vector<ll> primes = {2, 3, 5, 7, 11, 13, 17, 37};
auto is_prime = [&](ll x) -> bool {
    if (x <= 3)
        return x == 2 || x == 3;
    if (x % 2 == 0)
        return 0;
    ll d = x - 1, r = 0;
    while (d % 2 == 0) {
        d >>= 1;
        r++;
    }
    for (auto p : primes) {
        if (p > x)
            continue;
        if (x == p)
            return 1;
        if (x % p == 0)
            return 0;
        if (!MR(x, d, r, p))
            return 0;
    }
    return 1;
};
while (n--) {
    ll x;
    cin >> x;
    while (x++) {
        if (is_prime(x)) {
            cout << x << '\n';
            break;
        }
    }
}
```

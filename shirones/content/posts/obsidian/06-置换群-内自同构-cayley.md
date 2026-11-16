---
title: 06-置换群-内自同构-Cayley
published: 2026-10-25
description: 设 是一个非空集合。从 到 自身的一个双射（一一对应映射）称为 上的一个一一变换。 全体一一变换构成的集合记作 （或 ）。 当集合 时，从 到 的双射称为 次置换（Permutation）。 包含所有 次置换的集合记作 （或 ），称为 次对称群（Symmetric Group）。对称群 的任何一个子群都称为置换群。 在
image: ""
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# 06-置换群-内自同构-Cayley

## 1. 对称群 $S_n$ 与一一变换群

### 1.1 严格表述
设 $A$ 是一个非空集合。从 $A$ 到 $A$ 自身的一个双射（一一对应映射）称为 $A$ 上的一个**一一变换**。
全体一一变换构成的集合记作 $E(A)$（或 $\operatorname{Sym}(A)$）。
当集合 $A = \{1, 2, \dots, n\}$ 时，从 $A$ 到 $A$ 的双射称为 **$n$ 次置换（Permutation）**。
包含所有 $n$ 次置换的集合记作 $S_n$（或 $\operatorname{Sym}(n)$），称为 **$n$ 次对称群（Symmetric Group）**。对称群 $S_n$ 的任何一个子群都称为**置换群**。

### 1.2 运算方向约定
在置换的乘法（函数复合）中，本文遵循函数作用的标准次序——**从右向左复合**：
$$(\sigma \tau)(x) := \sigma(\tau(x)), \quad \forall x \in A$$
即右侧置换 $\tau$ 先作用，左侧置换 $\sigma$ 后作用。

### 1.3 形式化证明：$E(A)$ 在映射复合下构成群

#### 定理 6.1
设 $A$ 是非空集合，代数系统 $(E(A), \circ)$ 构成一个群。特别地，对称群 $S_n$ 构成阶为 $n!$ 的有限群。

**证明：**
1. **封闭性**：任取 $\sigma, \tau \in E(A)$。
   - **单射**：若 $(\sigma \circ \tau)(x_1) = (\sigma \circ \tau)(x_2) \implies \sigma(\tau(x_1)) = \sigma(\tau(x_2))$。因 $\sigma$ 为单射，故 $\tau(x_1) = \tau(x_2)$；又因 $\tau$ 为单射，故 $x_1 = x_2$。
   - **满射**：任取 $z \in A$。因 $\sigma$ 为满射，存在 $y \in A$ 使得 $\sigma(y) = z$；因 $\tau$ 为满射，存在 $x \in A$ 使得 $\tau(x) = y$。从而 $(\sigma \circ \tau)(x) = \sigma(\tau(x)) = \sigma(y) = z$。
   故 $\sigma \circ \tau$ 仍为双射，$\sigma \circ \tau \in E(A)$。
2. **结合律**：映射复合满足结合律：$[(\sigma \circ \tau) \circ \mu](x) = \sigma(\tau(\mu(x))) = [\sigma \circ (\tau \circ \mu)](x)$。
3. **单位元**：恒等映射 $I_A(x) = x$ 为双射，且满足 $\sigma \circ I_A = I_A \circ \sigma = \sigma$。
4. **逆元**：因 $\sigma$ 是双射，其反函数 $\sigma^{-1}: A \to A$ 存在且同为双射，满足 $\sigma \circ \sigma^{-1} = \sigma^{-1} \circ \sigma = I_A$。
综上，$(E(A), \circ)$ 构成群。
当 $|A| = n$ 时，集合 $A$ 到自身的不同双射总数等于 $n$ 个元素的全排列数 $n!$，故 $|S_n| = n!$。 $\blacksquare$

---

## 2. 循环置换（轮换）与不相交分解

### 2.1 循环置换的定义
设 $\sigma \in S_n$。若存在互不相同的下标序列 $(j_1, j_2, \dots, j_r)$（$r \ge 2$），使得：
$$\sigma(j_1) = j_2, \quad \sigma(j_2) = j_3, \quad \dots, \quad \sigma(j_r) = j_1$$
并且对不属于该序列的其余元素 $k$ 均有 $\sigma(k) = k$，则称 $\sigma$ 为一个 **$r$ 项循环置换（或长为 $r$ 的轮换）**，记作：
$$\sigma = (j_1\ j_2\ \dots\ j_r)$$
- 长为 2 的轮换称为**对换（Transposition）**，记作 $(a\ b)$。
- 若两个轮换包含变动的数字完全无交集，称它们**互不相交（Disjoint）**。

### 2.2 不相交轮换的可交换性

#### 定理 6.2
若 $\alpha, \beta \in S_n$ 是两个互不相交的循环置换，则它们可以交换次序：
$$\alpha \beta = \beta \alpha$$

**证明：**
设 $\alpha$ 变动的数字集合为 $A$，$\beta$ 变动的数字集合为 $B$。已知 $A \cap B = \emptyset$。
对任意 $x \in \{1, 2, \dots, n\}$ 逐点讨论：
1. 若 $x \in A$：因 $A \cap B = \emptyset$，故 $x \notin B$，得 $\beta(x) = x$。
   从而 $(\alpha \beta)(x) = \alpha(\beta(x)) = \alpha(x)$。
   又因 $\alpha(x) \in A$，故 $\alpha(x) \notin B$，得 $\beta(\alpha(x)) = \alpha(x)$。
   因此 $(\alpha \beta)(x) = (\beta \alpha)(x) = \alpha(x)$。
2. 若 $x \in B$：同理可得 $(\alpha \beta)(x) = (\beta \alpha)(x) = \beta(x)$。
3. 若 $x \notin A$ 且 $x \notin B$：则 $\alpha(x) = x, \beta(x) = x$，显然 $(\alpha \beta)(x) = (\beta \alpha)(x) = x$。
综上，对所有元素均有 $(\alpha \beta)(x) = (\beta \alpha)(x)$，故 $\alpha \beta = \beta \alpha$。 $\blacksquare$

### 2.3 不相交轮换分解定理与置换的阶

#### 定理 6.3（不相交轮换分解定理）
任何一个有限置换 $\sigma \in S_n$ 都可以唯一地表示为若干个互不相交且长度均 $\ge 2$ 的循环置换之积（在不计因式乘法先后次序的意义下）。

**证明：**
1. **存在性**：对置换 $\sigma$ 实际变动的元素个数 $t = |\{x \mid \sigma(x) \ne x\}|$ 施加数学归纳法。
   - 当 $t = 0$ 时，$\sigma = I$ 为恒等置换（空乘积），命题成立。
   - 假设变动元素个数 $< s$（$s \ge 1$）的所有置换均能分解为互不相交循环之积。
   - 考虑变动元素个数为 $s$ 的置换 $\sigma$。取变动元素 $j_1$，考察轨道序列 $j_1, \sigma(j_1), \sigma^2(j_1), \dots$。因集合有限，该序列必有重复项。设第一个满足 $\sigma^r(j_1) \in \{j_1, \sigma(j_1), \dots, \sigma^{r-1}(j_1)\}$ 的正整数为 $r$。
   - 若 $\sigma^r(j_1) = \sigma^i(j_1)$（$0 < i < r$），由单射性两边作用 $\sigma^{-1}$ 得 $\sigma^{r-1}(j_1) = \sigma^{i-1}(j_1)$，与 $r$ 的最小性矛盾。因此必有 $\sigma^r(j_1) = j_1$。
   - 定义循环 $\tau_1 = (j_1\ \sigma(j_1)\ \dots\ \sigma^{r-1}(j_1))$。令 $\sigma_1 = \sigma \tau_1^{-1}$，则 $\sigma_1$ 在 $\{j_1, \dots, \sigma^{r-1}(j_1)\}$ 上恒等，实际变动元素个数为 $s - r < s$。
   - 由归纳假设，$\sigma_1$ 可分解为与 $\tau_1$ 均不相交的循环之积 $\tau_2 \cdots \tau_k$。故 $\sigma = \tau_1 \tau_2 \cdots \tau_k$。存在性得证。
2. **唯一性**：设 $\sigma = \tau_1 \cdots \tau_k = \rho_1 \cdots \rho_m$ 为两组互不相交循环之积（每项长 $\ge 2$）。
   任取变动元素 $x$。在第一组分解中，$x$ 恰好属于唯一的循环（不妨设为 $\tau_1$），且对所有整数 $d$ 有 $\sigma^d(x) = \tau_1^d(x)$。
   在第二组分解中，$x$ 也必属于唯一的循环（不妨设为 $\rho_1$），同理对所有整数 $d$ 有 $\sigma^d(x) = \rho_1^d(x)$。
   因此 $\tau_1$ 与 $\rho_1$ 的轨道集合都是 $\{\sigma^d(x) \mid d \ge 0\}$，且其在循环中的轮换作用完全由 $\sigma$ 在该轨道上的映射确定。故 $\tau_1$ 与 $\rho_1$ 作为置换完全相等（至多循环内部起点写法不同）。
   两边消去 $\tau_1 = \rho_1$ 并对变动元素集合重复上述论证，最终可得 $k = m$ 且两组循环因子集合完全一致。 $\blacksquare$

#### 定理 6.4（置换求阶公式）
设置换 $\sigma$ 分解为互不相交循环之积 $\sigma = \tau_1 \tau_2 \cdots \tau_k$，其中各循环的长度分别为 $r_1, r_2, \dots, r_k$。则置换 $\sigma$ 的阶为：
$$\operatorname{ord}(\sigma) = \operatorname{lcm}(r_1, r_2, \dots, r_k)$$

约定空列表的 LCM 为 1，对应恒等置换的阶。

**证明：**
因各循环 $\tau_i$ 互不相交，由定理 6.2 它们两两可交换。
因此对任意正整数 $m$：$\sigma^m = \tau_1^m \tau_2^m \cdots \tau_k^m$。
又因各循环作用的变动集合互不相交，$\sigma^m = I \iff \forall i \in \{1, \dots, k\}, \tau_i^m = I$。
单个长为 $r_i$ 的循环其阶等于长度 $r_i$，即 $\operatorname{ord}(\tau_i) = r_i$。
由阶的整除性质，$\tau_i^m = I \iff r_i \mid m$。
使得所有 $r_i \mid m$ 成立的最小正整数 $m$ 即为最小公倍数 $\operatorname{lcm}(r_1, \dots, r_k)$。 $\blacksquare$

---

## 3. 对换、奇偶置换与交代群 $A_n$

### 3.1 任意置换的对换分解

#### 定理 6.5
当 $n \ge 2$ 时，任何置换都可以表示为有限个对换的乘积。

**证明：**
由定理 6.3，只需证明任意轮换均能分解为对换之积即可。
直接验证公式：
$$(j_1\ j_2\ \dots\ j_r) = (j_1\ j_r)(j_1\ j_{r-1}) \cdots (j_1\ j_3)(j_1\ j_2)$$
从右向左依次复合追踪各元素：
- $j_1 \mapsto j_2$（最右侧对换将 $j_1$ 变到 $j_2$，其余对换均不动 $j_2$）；
- $j_k \mapsto j_1 \mapsto j_{k+1}$（第 $k-1$ 个对换将 $j_k$ 变到 $j_1$，紧接着第 $k$ 个对换将 $j_1$ 变到 $j_{k+1}$）；
- $j_r \mapsto j_1$（最左侧对换将 $j_r$ 变到 $j_1$）。
映射结果与 $(j_1\ j_2\ \dots\ j_r)$ 完全相同。一个长为 $r$ 的循环可分解为 $r - 1$ 个对换。 $\blacksquare$

### 3.2 对换个数奇偶性不变量定理

置换分解为对换的乘积方式并不唯一，但分解所得对换个数的奇偶性是客观不变量。

#### 定理 6.6（对换奇偶性不变量定理）
设置换 $\sigma \in S_n$。若 $\sigma$ 既能表示为 $k$ 个对换之积，又能表示为 $m$ 个对换之积，则 $k \equiv m \pmod 2$。

**证明：**
考虑 $n$ 元多项式（差分多项式）：
$$\Delta(x_1, x_2, \dots, x_n) = \prod_{1 \le i < j \le n} (x_j - x_i)$$
对任意置换 $\sigma \in S_n$，定义其对多项式的变量置换作用为：
$$\sigma(\Delta) = \prod_{1 \le i < j \le n} (x_{\sigma(j)} - x_{\sigma(i)})$$
因 $\sigma$ 为双射，$\{ \{\sigma(i), \sigma(j)\} \mid 1 \le i < j \le n \}$ 遍历了全集合的所有两元子集。故乘积中的每一个因子 $x_{\sigma(j)} - x_{\sigma(i)}$ 在绝对值上对应原本的某个因子 $x_q - x_p$（$p < q$），仅差符号。
因此必存在常数 $c_\sigma \in \{1, -1\}$，使得 $\sigma(\Delta) = c_\sigma \Delta$。

1. **同态性质**：对任意 $\sigma, \tau \in S_n$：
   $$(\sigma \tau)(\Delta) = \sigma(\tau(\Delta)) = \sigma(c_\tau \Delta) = c_\tau \sigma(\Delta) = c_\tau c_\sigma \Delta = (c_\sigma c_\tau) \Delta$$
   因此 $c_{\sigma \tau} = c_\sigma c_\tau$。
2. **计算单个对换的符号常数**：
   考虑任意对换 $\rho = (s\ t)$（设 $1 \le s < t \le n$）。考察乘积中各因式 $(x_j - x_i)$（$i < j$）在 $\rho$ 作用下的符号变化：
   - 若 $\{i, j\} \cap \{s, t\} = \emptyset$，因子不变；
   - 对因子 $(x_t - x_s)$，作用后变为 $x_s - x_t = -(x_t - x_s)$，符号反转一次；
   - 对满足 $s < k < t$ 的每个 $k$：
     因子 $x_k - x_s$ 变为 $x_k - x_t = -(x_t - x_k)$；
     因子 $x_t - x_k$ 变为 $x_s - x_k = -(x_k - x_s)$；
     这两个因子均反号，其乘积不变号；这样的中间元素共有 $t - s - 1$ 个，产生 $2(t - s - 1)$ 次变号；
   - 对 $k < s$ 或 $k > t$ 的元素，同样成对保持符号不变。
   综上，受对换 $\rho$ 作用反号的因子总数为 $1 + 2(t - s - 1)$，恒为奇数。
   因此对任意对换 $\rho$，均有 $c_\rho = -1$。
3. **完成证明**：
   若 $\sigma = \tau_1 \tau_2 \cdots \tau_k = \rho_1 \rho_2 \cdots \rho_m$（各 $\tau_i, \rho_j$ 均为对换），则：
   $$c_\sigma = (-1)^k = (-1)^m$$
   从而 $(-1)^k = (-1)^m \implies k \equiv m \pmod 2$。 $\blacksquare$

### 3.3 奇偶置换与交代群 $A_n$

#### 定义 6.7
- 能表示为**偶数个**对换之积的置换称为**偶置换**；
- 能表示为**奇数个**对换之积的置换称为**奇置换**。
- 由定理 6.5，长为 $r$ 的循环可分解为 $r - 1$ 个对换。因此：长度为奇数的循环是偶置换，长度为偶数的循环是奇置换。

#### 定理 6.8（交代群的子群性质与阶数）
$S_n$ 中全体偶置换构成的集合关于置换乘法构成一个群，称为 **$n$ 次交代群（Alternating Group）**，记作 $A_n$。
当 $n \ge 2$ 时，其阶数为：
$$|A_n| = \frac{n!}{2}$$

**证明：**
1. **子群性质**：
   - 单位元 $I$ 是零个对换的乘积（空乘积），故 $I \in A_n$。
   - 设 $\sigma$ 含偶数 $2k$ 个对换，$\tau$ 含偶数 $2m$ 个对换，则 $\sigma\tau$ 含 $2k + 2m$ 个对换，仍为偶数，故封闭。
   - $\sigma^{-1} = (\tau_1 \cdots \tau_{2k})^{-1} = \tau_{2k} \cdots \tau_1$ 包含 $2k$ 个对换，故 $\sigma^{-1} \in A_n$。因此 $A_n \le S_n$。
2. **阶数证明**：
   设 $S_n$ 中全体奇置换构成的集合为 $B_n$。固定对换 $\rho = (1\ 2)$。
   定义映射 $f: A_n \to B_n, f(\sigma) = \rho \sigma$。
   - 偶置换左乘一个对换变为奇置换，映射良定。
   - 单射性：若 $\rho \sigma_1 = \rho \sigma_2$，左乘 $\rho^{-1}$ 即得 $\sigma_1 = \sigma_2$。
   - 满射性：对任意 $\mu \in B_n$，$\rho \mu$ 为偶置换（$\rho \mu \in A_n$），且 $f(\rho \mu) = \rho^2 \mu = \mu$。
   故 $f$ 是双射，从而 $|A_n| = |B_n|$。
   又因 $S_n = A_n \cup B_n$ 且 $A_n \cap B_n = \emptyset$，故 $|A_n| + |B_n| = n! \implies |A_n| = \frac{n!}{2}$。 $\blacksquare$

---

## 4. 3-轮换生成交代群定理

#### 定理 6.9
当 $n \ge 3$ 时，$n$ 次交代群 $A_n$ 是由全体 3-轮换生成的：
$$A_n = \langle (a\ b\ c) \mid a, b, c \in \{1, 2, \dots, n\} \rangle$$

**证明：**
任取 $\sigma \in A_n$。由偶置换定义，$\sigma$ 可以分解为偶数个对换的乘积：
$$\sigma = (\tau_1 \tau_2)(\tau_3 \tau_4) \cdots (\tau_{2k-1} \tau_{2k})$$
只需证明：**任意两个对换的乘积 $\tau \rho$ 均可表示为 3-轮换或其乘积**。
设 $\tau = (a\ b), \rho = (c\ d)$。按涉及的互异元素个数分类讨论：
1. **重叠 2 个元素**（对换相同）：
   $$(a\ b)(a\ b) = I = (a\ b\ c)(a\ c\ b)$$
2. **重叠 1 个元素**（不妨设公共元素为 $a$）：
   从右向左复合验证：
   $$(a\ b)(a\ c) = (a\ c\ b)$$
3. **重叠 0 个元素**（4 个元素 $a, b, c, d$ 互不相同）：
   在中间插入 $(b\ c)(b\ c) = I$：
   $$(a\ b)(c\ d) = (a\ b) \cdot [(b\ c)(b\ c)] \cdot (c\ d) = [(a\ b)(b\ c)] \cdot [(b\ c)(c\ d)]$$
   利用情况 2 的结论：$[(a\ b)(b\ c)] = (a\ b\ c)$，$[(b\ c)(c\ d)] = (b\ c\ d)$。
   因此：
   $$(a\ b)(c\ d) = (a\ b\ c)(b\ c\ d)$$
   为两个 3-轮换之积。
综合上述三种情形，任意两个对换之积均可表示为 3-轮换之积，故全体 3-轮换生成 $A_n$。 $\blacksquare$

---

## 5. 置换的共轭与循环型

### 5.1 置换共轭的作用形式

#### 定理 6.10（置换共轭公式）
设 $\sigma = (i_1\ i_2\ \dots\ i_r)$ 是 $S_n$ 中的一个 $r$-循环，$\tau \in S_n$ 是任意置换。则共轭置换 $\tau \sigma \tau^{-1}$ 仍然是长为 $r$ 的循环，且形式为：
$$\tau \sigma \tau^{-1} = (\tau(i_1)\ \tau(i_2)\ \dots\ \tau(i_r))$$

**证明：**
对任意 $x \in \{1, \dots, n\}$ 计算 $(\tau \sigma \tau^{-1})(x)$：
1. 若 $x = \tau(i_k)$（$1 \le k \le r$）：
   - 第一步：$\tau^{-1}(x) = i_k$；
   - 第二步：$\sigma(i_k) = i_{k+1}$（约定 $k=r$ 时下一项为 $i_1$）；
   - 第三步：$\tau(i_{k+1})$。
   连起来得到 $(\tau \sigma \tau^{-1})(\tau(i_k)) = \tau(i_{k+1})$。这与循环 $(\tau(i_1)\ \dots\ \tau(i_r))$ 在元素 $\tau(i_k)$ 上的映射一致。
2. 若 $x \notin \{\tau(i_1), \dots, \tau(i_r)\}$：
   则 $\tau^{-1}(x) \notin \{i_1, \dots, i_r\}$。
   由定义 $\sigma(\tau^{-1}(x)) = \tau^{-1}(x)$。
   再由左侧 $\tau$ 作用得 $\tau(\tau^{-1}(x)) = x$。即该元素保持不动。
综合两类情形，公式成立。 $\blacksquare$

### 5.2 循环型与共轭类分类定理

置换的不相交循环长度序列（包含长为 1 的不动点循环）称为该置换的**循环型（Cycle Type）**。

#### 定理 6.11（共轭类与循环型充要条件）
在对称群 $S_n$ 中，两个置换 $\sigma, \sigma'$ 共轭当且仅当它们具有相同的循环型。

**证明：**
1. **必要性**：设存在 $\tau \in S_n$ 使得 $\sigma' = \tau \sigma \tau^{-1}$。
   将 $\sigma$ 写为不相交循环之积 $\sigma = \pi_1 \pi_2 \cdots \pi_k$。
   由定理 6.10，$\sigma' = \tau \pi_1 \tau^{-1} \cdot \tau \pi_2 \tau^{-1} \cdots \tau \pi_k \tau^{-1}$。
   因 $\tau$ 是双射，每个循环 $\tau \pi_j \tau^{-1}$ 的长度与 $\pi_j$ 完全相同，且变动元素集合两两不相交。
   故 $\sigma'$ 与 $\sigma$ 具有完全相同的循环型。
2. **充分性**：设 $\sigma$ 与 $\sigma'$ 具有相同的循环型。
   将两者的不相交循环分解（包括长度为 1 的不动点）按循环长度从大到小依次写出：
   $$\sigma = (a_{1,1}\ \dots\ a_{1, r_1})(a_{2,1}\ \dots\ a_{2, r_2}) \cdots (a_{m,1}\ \dots\ a_{m, r_m})$$
   $$\sigma' = (b_{1,1}\ \dots\ b_{1, r_1})(b_{2,1}\ \dots\ b_{2, r_2}) \cdots (b_{m,1}\ \dots\ b_{m, r_m})$$
   其中 $\sum_{i=1}^m r_i = n$，且 $\{a_{i,j}\}$ 与 $\{b_{i,j}\}$ 分别构成了集合 $\{1, 2, \dots, n\}$ 的完整排列。
   定义映射 $\tau: \{1, \dots, n\} \to \{1, \dots, n\}$ 为：
   $$\tau(a_{i, j}) = b_{i, j} \quad (1 \le i \le m, 1 \le j \le r_i)$$
   因 $\tau$ 将全集的一个全排列映为另一个全排列，故 $\tau$ 是双射，$\tau \in S_n$。
   由定理 6.10：
   $$\tau \sigma \tau^{-1} = (\tau(a_{1,1})\ \dots\ \tau(a_{1, r_1})) \cdots (\tau(a_{m,1})\ \dots\ \tau(a_{m, r_m})) = \sigma'$$
   故 $\sigma$ 与 $\sigma'$ 在 $S_n$ 中共轭。 $\blacksquare$

---

## 6. 【选读】单群与 $A_5$ 的单群性

### 6.1 单群（Simple Group）的定义
如果非平凡群 $G\ne\{e\}$ 除了平凡子群 $\{e\}$ 和其自身 $G$ 之外，**不存在任何其他正规子群**，则称群 $G$ 为**单群（Simple Group）**。

### 6.2 交代群 $A_5$ 的单群性（依赖群作用与共轭类划分）

> **依赖声明**：本小节引用 $A_5$ 的完整共轭类分解 $1, 15, 20, 12, 12$（包括 3-轮换、双对换各自形成单个 $A_5$ 共轭类，以及 5-轮换分裂）作为外部结论。

#### 结论 6.12
5 次交代群 $A_5$（阶数为 60）是一个单群。

**推导过程：**
设 $N \triangleleft A_5$ 为正规子群。正规子群对共轭运算封闭，因此 $N$ 必定是由 $A_5$ 内部若干个完整的共轭类构成的并集，且必须包含单位元类。
$A_5$ 中 60 个元素划分为 5 个共轭类：
1. 单位元类 $C_1$：大小为 $1$；
2. 双对换类 $C_{2,2}$（形如 $(a\ b)(c\ d)$）：大小为 $\frac{\binom{5}{4} \times 3}{1} = 15$；
3. 3-轮换类 $C_3$（形如 $(a\ b\ c)$）：大小为 $\binom{5}{3} \times 2 = 20$；
4. 5-轮换类在 $A_5$ 中分裂为两个类 $C_5', C_5''$：大小各为 $12$。
总计：$1 + 15 + 20 + 12 + 12 = 60$。
若存在正规子群 $N$，其阶数 $|N|$ 必须满足以下两个条件：
- $|N| = 1 + 15 a + 20 b + 12 c + 12 d$（其中 $a, b, c, d \in \{0, 1\}$）；
- 由 Lagrange 定理，$|N| \mid 60$。
逐一检查所有非空选择组合的和：
- 取 1 个非单位元类：$1+12=13, 1+15=16, 1+20=21$，均不能整除 60；
- 取 2 个非单位元类：$1+12+12=25, 1+12+15=28, 1+12+20=33, 1+15+20=36$，均不能整除 60；
- 取 3 个非单位元类：$1+12+12+15=40, 1+12+12+20=45, 1+12+15+20=48$，均不能整除 60；
- 取 4 个非单位元类（全选）：$1+12+12+15+20=60$，对应全群 $N = A_5$；
- 不取非单位元类：$|N|=1$，对应平凡子群 $N=\{e\}$。
因此 $A_5$ 不存在非平凡正规子群，$A_5$ 必为单群。
（注：更一般的群论结果表明当 $n \ge 5$ 时 $A_n$ 均为单群，该性质在伽罗瓦理论中与代数方程的可解性相关，属于后续群论内容。）

---

## 7. 自同构群与内自同构群

### 7.1 内自同构的严格定义与验证

#### 定理 6.13
设 $G$ 是群。对固定元素 $g \in G$，定义映射：
$$\sigma_g: G \to G, \quad \sigma_g(x) = g x g^{-1} \quad (\forall x \in G)$$
则 $\sigma_g$ 是群 $G$ 的一个自同构（$\sigma_g \in \operatorname{Aut}(G)$），称为由 $g$ 诱导的**内自同构（Inner Automorphism）**。
全体内自同构构成的集合记作 $\operatorname{Inn}(G) = \{\sigma_g \mid g \in G\}$，它是自同构群 $\operatorname{Aut}(G)$ 的子群。

**证明：**
1. **同态性**：
   $$\sigma_g(xy) = g(xy)g^{-1} = g x (g^{-1} g) y g^{-1} = (g x g^{-1})(g y g^{-1}) = \sigma_g(x)\sigma_g(y)$$
2. **单射**：若 $\sigma_g(x) = \sigma_g(y) \implies g x g^{-1} = g y g^{-1}$。两边左乘 $g^{-1}$、右乘 $g$，得 $x = y$。
3. **满射**：对任意 $y \in G$，取 $x = g^{-1} y g \in G$，则 $\sigma_g(x) = g(g^{-1}yg)g^{-1} = y$。
故 $\sigma_g$ 是双射同态，$\sigma_g \in \operatorname{Aut}(G)$。 $\blacksquare$

### 7.2 内自同构群与群中心的商群同构

#### 定理 6.14
设 $G$ 是群，$Z(G)$ 是群的中心。则：
$$G/Z(G) \cong \operatorname{Inn}(G)$$

**证明：**
构造映射：
$$\Psi: G \to \operatorname{Inn}(G), \quad \Psi(g) = \sigma_g$$
1. **同态性**：对任意 $g, h \in G$ 及 $x \in G$：
   $$\sigma_{gh}(x) = (gh)x(gh)^{-1} = g(hxh^{-1})g^{-1} = \sigma_g(\sigma_h(x)) = (\sigma_g \circ \sigma_h)(x)$$
   由映射相等的定义，$\sigma_{gh} = \sigma_g \circ \sigma_h$，即 $\Psi(gh) = \Psi(g)\Psi(h)$。
2. **满射性**：由 $\operatorname{Inn}(G)$ 的定义，每个内自同构均形如 $\sigma_g = \Psi(g)$，故 $\Psi$ 是满同态。
3. **求解同态核 $\operatorname{Ker}\Psi$**：
   $\operatorname{Aut}(G)$ 的单位元是恒等变换 $I_G$。
   $$\operatorname{Ker}\Psi = \{g \in G \mid \Psi(g) = I_G\} = \{g \in G \mid \sigma_g = I_G\}$$
   $$\sigma_g = I_G \iff \forall x \in G, gxg^{-1} = x \iff \forall x \in G, gx = xg$$
   与群中每个元素均可交换的元素集合正是群中心 $Z(G)$。因此：
   $$\operatorname{Ker}\Psi = Z(G)$$
4. **应用第一同构定理**：
   由定理 5.1（第一同构定理），自然诱导同构：
   $$G/\operatorname{Ker}\Psi \cong \operatorname{Im}\Psi \implies G/Z(G) \cong \operatorname{Inn}(G) \quad \blacksquare$$

---

## 8. 凯莱定理（Cayley's Theorem）

### 8.1 严格表述

#### 定理 6.15（Cayley 定理）
任何群 $G$ 都与集合 $G$ 上的一个变换群同构。
特别地，任何 $n$ 阶有限群都同构于 $n$ 次对称群 $S_n$ 的某个子群（即同构于一个置换群）。

### 8.2 形式化证明

**证明：**
设 $G$ 是群，$E(G)$ 是集合 $G$ 到自身的全体双射构成的群。
对任意 $a \in G$，定义左乘变换：
$$L_a: G \to G, \quad L_a(x) = ax \quad (\forall x \in G)$$
1. **验证 $L_a \in E(G)$（$L_a$ 是双射）**：
   - 单射：若 $L_a(x_1) = L_a(x_2) \implies ax_1 = ax_2 \implies x_1 = x_2$（群消去律）。
   - 满射：对任意 $y \in G$，取 $x = a^{-1}y \in G$，则 $L_a(x) = a(a^{-1}y) = y$。
   故 $L_a$ 为双射，$L_a \in E(G)$。
2. **构造映射**：
   定义 $\Phi: G \to E(G)$ 为 $\Phi(a) = L_a$。
3. **验证 $\Phi$ 是群同态**：
   任取 $a, b \in G$。对任意 $x \in G$：
   $$(L_a \circ L_b)(x) = L_a(L_b(x)) = L_a(bx) = a(bx) = (ab)x = L_{ab}(x)$$
   因此 $L_a \circ L_b = L_{ab}$，即 $\Phi(a) \circ \Phi(b) = \Phi(ab)$，$\Phi$ 为群同态。
4. **验证 $\Phi$ 是单同态**：
   考察同态核：
   $$\operatorname{Ker}\Phi = \{a \in G \mid \Phi(a) = I_G\} = \{a \in G \mid L_a = I_G\}$$
   若 $L_a = I_G$，则对所有 $x \in G$ 均有 $ax = x$。
   特别取 $x = e$，得 $ae = e \implies a = e$。
   故 $\operatorname{Ker}\Phi = \{e\}$，由定理 4.7，$\Phi$ 为单同态。
5. **得出同构结论**：
   $\Phi$ 在其同态像 $\bar{G} = \operatorname{Im}\Phi = \{L_a \mid a \in G\} \le E(G)$ 上构成双射同态。
   因此：
   $$G \cong \bar{G} \le E(G) \quad \blacksquare$$

### 8.3 左乘与右乘的区别

若定义右乘变换 $R_a(x) = xa$，计算复合映射：
$$(R_a \circ R_b)(x) = R_a(R_b(x)) = R_a(xb) = (xb)a = x(ba) = R_{ba}(x)$$
若群为非交换群，存在 $ab \ne ba$，则 $R_a \circ R_b = R_{ba} \ne R_{ab}$。该映射反转了运算次序，构成了反同态。
若定义带逆元的右侧作用 $R'_a(x) = x a^{-1}$，则 $(R'_a \circ R'_b)(x) = (x b^{-1}) a^{-1} = x (b^{-1} a^{-1}) = x (ab)^{-1} = R'_{ab}(x)$，同样可构成群同态。

---

## 9. 核心易错点

1. **置换复合次序**：代数计算约定为 $(\sigma\tau)(x) = \sigma(\tau(x))$ 从右向左复合计算，避免按矩阵书写顺序从左向右读取。
2. **长循环分解为对换**：$r$-循环 $(j_1\ j_2\ \dots\ j_r)$ 分解为 $r-1$ 个对换 $(j_1\ j_r)(j_1\ j_{r-1}) \cdots (j_1\ j_2)$，不能拆分成独立的两个非重叠对换。
3. **借桥分解的元素对应**：在将两个不相交对换 $(a\ b)(c\ d)$ 改写为 3-轮换乘积时，借助恒等式 $(a\ b)(c\ d) = (a\ b\ c)(b\ c\ d)$，需注意元素排列顺序。
4. **单群的同态像**：单群没有非平凡正规子群，因此任何从单群出发的群同态，其核要么为 $\{e\}$（此时为单同态），要么为全群（此时像为平凡群 $\{e'\}$）。

---

## 10. 前后知识连接

- **前置依赖**：群公理（`01-群与子群.md`）、Lagrange 定理与商群（`03-陪集-Lagrange-正规子群.md`）、第一同构定理（`05-三大同构定理.md`）。
- **向后驱动**：
  - Cayley 定理证明了置换群可作为有限群的具体模型。
  - 循环分解与置换求阶是算法竞赛中置换环分析、快速幂及 Burnside/Pólya 计数（[算法竞赛数学套路](/posts/obsidian/%E7%AE%97%E6%B3%95%E7%AB%9E%E8%B5%9B%E6%95%B0%E5%AD%A6%E5%A5%97%E8%B7%AF/)、[抽象代数的竞赛用法](/posts/obsidian/%E6%8A%BD%E8%B1%A1%E4%BB%A3%E6%95%B0%E7%9A%84%E7%AB%9E%E8%B5%9B%E7%94%A8%E6%B3%95/)）的基础。

---
title: 03-陪集-Lagrange-正规子群
published: 2026-09-24
description: 设 是群 的子群。对于任意 ： 1. 左陪集（Left Coset）：集合 称为子群 在 中关于代表元 的左陪集。 2. 右陪集（Right Coset）：集合 称为子群 在 中关于代表元 的右陪集。 元素 称为该陪集的代表元（Representative）。 陪集是用子群 作为基准结构对全群 进行的平移划分。陪集本身
image: ""
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# 03-陪集-Lagrange-正规子群

## 1. 陪集的严格定义与性质

### 1.1 严格表述
设 $H$ 是群 $G$ 的子群。对于任意 $a \in G$：
1. **左陪集（Left Coset）**：集合 $aH := \{ah \mid h \in H\}$ 称为子群 $H$ 在 $G$ 中关于代表元 $a$ 的左陪集。
2. **右陪集（Right Coset）**：集合 $Ha := \{ha \mid h \in H\}$ 称为子群 $H$ 在 $G$ 中关于代表元 $a$ 的右陪集。

元素 $a$ 称为该陪集的**代表元（Representative）**。

### 1.2 数学直觉
陪集是用子群 $H$ 作为基准结构对全群 $G$ 进行的平移划分。陪集本身通常不包含单位元，因而不是子群；当且仅当代表元属于 $H$ 时，陪集才等于 $H$ 本身。

### 1.3 陪集的核心性质及其证明

#### 定理 3.1（代表元包含性与平凡陪集）
1. $\forall a \in G$，$a \in aH$ 且 $a \in Ha$；
2. $eH = H = He$；
3. $a \in H \iff aH = H$。

**证明：**
1. 因 $H \le G$，单位元 $e \in H$。故 $a = ae \in aH$，$a = ea \in Ha$。
2. $eH = \{eh \mid h \in H\} = \{h \mid h \in H\} = H$。
3. 若 $a \in H$，对任意 $h \in H$，由封闭性 $ah \in H \implies aH \subseteq H$；又对任意 $h \in H$，$h = a(a^{-1}h) \in aH \implies H \subseteq aH$，故 $aH = H$。反之，若 $aH = H$，由 $a \in aH$ 得 $a \in H$。 $\blacksquare$

#### 定理 3.2（陪集相等的充要判定准则）
设 $H \le G$，$a, b \in G$。下列命题等价：
1. $aH = bH$；
2. $aH \cap bH \ne \emptyset$；
3. $b \in aH$；
4. $a^{-1}b \in H$。

**证明：**
- **$1 \implies 2$**：若 $aH = bH$，由 $b = be \in bH = aH$，交集非空。
- **$2 \implies 3$**：设 $x \in aH \cap bH$。存在 $h_1, h_2 \in H$ 使得 $x = ah_1 = bh_2$。
  两边右乘 $h_2^{-1}$，得 $b = a(h_1 h_2^{-1})$。因为 $H \le G$，故 $h_1 h_2^{-1} \in H$，所以 $b \in aH$。
- **$3 \implies 4$**：若 $b \in aH$，存在 $h \in H$ 使得 $b = ah$。两边左乘 $a^{-1}$，得 $a^{-1}b = h \in H$。
- **$4 \implies 1$**：若 $a^{-1}b \in H$，设 $h_0 = a^{-1}b \in H$，则 $b = ah_0$。
  对任意 $bh \in bH$，有 $bh = (ah_0)h = a(h_0 h) \in aH \implies bH \subseteq aH$。
  同理，由 $a^{-1}b \in H \implies (a^{-1}b)^{-1} = b^{-1}a \in H$，推得 $aH \subseteq bH$。
  因此 $aH = bH$。 $\blacksquare$

> [!NOTE] 代数直觉
> $a^{-1}b \in H$ 表示 $a$ 与 $b$ 的代数差异落在了子群 $H$ 内部。在加法群中，该条件对应于差值 $b - a \in H$。

#### 定理 3.3（模 $H$ 同余与等价划分）
定义群 $G$ 上的二元关系 $\equiv_L$ 为：
$$a \equiv_L b \pmod H \iff a^{-1}b \in H$$
则 $\equiv_L$ 是群 $G$ 上的一个**等价关系**。其等价类集合正是子群 $H$ 在 $G$ 中的全体左陪集：
$$[a] = aH$$
因此，所有互不相交的左陪集构成群 $G$ 的一个严格无缝划分：
$$G = \bigcup_{i \in I} a_i H, \quad \text{且 } a_i H \cap a_j H = \emptyset\ (i \ne j)$$

**证明：**
1. **自反性**：$\forall a \in G$，$a^{-1}a = e \in H \implies a \equiv_L a$。
2. **对称性**：若 $a \equiv_L b$，则 $a^{-1}b \in H$。由子群对求逆封闭，$(a^{-1}b)^{-1} = b^{-1}a \in H \implies b \equiv_L a$。
3. **传递性**：若 $a \equiv_L b$ 且 $b \equiv_L c$，则 $a^{-1}b \in H$ 且 $b^{-1}c \in H$。
   由子群对乘法封闭：$(a^{-1}b)(b^{-1}c) = a^{-1}(bb^{-1})c = a^{-1}c \in H \implies a \equiv_L c$。
由集合论基本定理，等价关系唯一确定集合划分，等价类 $[a] = \{x \in G \mid a^{-1}x \in H\} = \{ah \mid h \in H\} = aH$。 $\blacksquare$

---

## 2. 陪集的等势性与拉格朗日定理（Lagrange）

### 2.1 陪集大小的等势性

#### 定理 3.4
设 $H \le G$。对任意 $a \in G$，左陪集 $aH$ 与子群 $H$ 等势，即：
$$|aH| = |H|$$

**证明：**
构造映射 $f: H \to aH$，定义为 $f(h) = ah$（$\forall h \in H$）。
1. **单射性**：设 $h_1, h_2 \in H$。若 $f(h_1) = f(h_2)$，即 $ah_1 = ah_2$。
   根据群的左消去律，两边左乘 $a^{-1}$ 得出 $h_1 = h_2$。故 $f$ 是单射。
2. **满射性**：任取 $y \in aH$，由左陪集定义，存在 $h \in H$ 使得 $y = ah = f(h)$。故 $f$ 是满射。
因此 $f$ 是双射，集合 $aH$ 与 $H$ 具有相同的基数。对于有限群，必然有 $|aH| = |H|$。 $\blacksquare$

### 2.2 拉格朗日定理（Lagrange's Theorem）

#### 定理 3.5（Lagrange 定理）
设 $G$ 是有限群，$H$ 是 $G$ 的任意子群。则子群的阶 $|H|$ 必定整除大群的阶 $|G|$，且有：
$$|G| = [G : H] \cdot |H|$$
其中 $[G : H]$ 称为子群 $H$ 在群 $G$ 中的**指数（Index）**，即群 $G$ 中互不相交的左陪集总数。

**证明：**
由定理 3.3，群 $G$ 可以无重叠、无遗漏地划分成有限个互不相同的左陪集：
$$G = a_1 H \cup a_2 H \cup \cdots \cup a_k H$$
其中 $k = [G : H]$，且对任意 $i \ne j$ 有 $a_i H \cap a_j H = \emptyset$。
对划分两边的元素个数求和：
$$|G| = \sum_{i=1}^k |a_i H|$$
由定理 3.4，每一个陪集的大小均严格等于 $|H|$：
$$|G| = \sum_{i=1}^k |H| = k \cdot |H| = [G : H] \cdot |H|$$
两边除以 $|H|$，得出 $[G : H] = \frac{|G|}{|H|}$ 为正整数，故 $|H| \mid |G|$。 $\blacksquare$

### 2.3 核心推论

#### 推论 3.6（元素的阶整除群阶）
设 $G$ 是有限群。对任意元素 $a \in G$：
$$\operatorname{ord}(a) \mid |G|$$
从而：
$$a^{|G|} = e$$

**证明：**
考察由元素 $a$ 生成的循环子群 $H = \langle a \rangle$。
由定义，$|H| = \operatorname{ord}(a)$。
根据 Lagrange 定理，$|H| \mid |G|$，即 $\operatorname{ord}(a) \mid |G|$。
设 $|G| = q \cdot \operatorname{ord}(a)$，则 $a^{|G|} = (a^{\operatorname{ord}(a)})^q = e^q = e$。 $\blacksquare$

> **数论应用**：
> - **欧拉定理**：在模 $m$ 简化剩余系乘法群 $(\mathbb{Z}_m^\times, \times)$ 中，群阶为 $\phi(m)$。对任意与 $m$ 互质的整数 $a$，由该推论立得 $a^{\phi(m)} \equiv 1 \pmod m$。
> - **费马小定理**：当 $m = p$ 为素数时，$\phi(p) = p - 1$，立得 $a^{p-1} \equiv 1 \pmod p$。

#### 推论 3.7（素数阶群必为循环群）
若有限群 $G$ 的阶 $|G| = p$ 是一个素数，则 $G$ 必为循环群。

**证明：**
任取非单位元 $a \in G$（$a \ne e$）。
考察其阶 $\operatorname{ord}(a)$。由推论 3.6，$\operatorname{ord}(a) \mid p$。
因为 $p$ 是素数，其正因数仅有 $1$ 和 $p$。
又因 $a \ne e$，$\operatorname{ord}(a) > 1$，所以只能是 $\operatorname{ord}(a) = p$。
由此，由 $a$ 生成的循环子群包含 $p$ 个元素，即 $\langle a \rangle = G$。
群 $G$ 由单元素生成，故必为循环群。 $\blacksquare$

---

## 3. 拉格朗日定理逆命题的反思与反例

### 3.1 逆命题的不成立性
Lagrange 定理给出了子群阶数的**必要条件**（必须是因数），但并不构成**充分条件**：
> 若 $d \mid |G|$，群 $G$ 中**不一定**存在阶为 $d$ 的子群。

### 3.2 经典反例：交代群 $A_4$ 没有 6 阶子群

#### 定理 3.8
4 次交代群 $A_4$ 的阶数为 $|A_4| = \frac{4!}{2} = 12$。虽然 $6 \mid 12$，但 $A_4$ 内部不存在任何 6 阶子群。

**形式化证明（反证法）：**
假设 $A_4$ 存在一个 6 阶子群 $H$（$|H| = 6$）。
1. **子群的指数与正规性**：
   $$[A_4 : H] = \frac{|A_4|}{|H|} = \frac{12}{6} = 2$$
   由后续定理 3.10（指数为 2 的子群必正规），必有 $H \triangleleft A_4$。
2. **商群平方性质**：
   既然 $H$ 正规，商群 $A_4 / H$ 存在且阶为 2：
   $$|A_4 / H| = [A_4 : H] = 2$$
   二阶群中的任何元素其平方必为单位元（商群的单位元即陪集 $H$）。
   因此，对全群中任意元素 $g \in A_4$，在商群中均有：
   $$(gH)^2 = H \implies g^2 H = H \implies g^2 \in H$$
3. **引入 3-轮换导出矛盾**：
   任取 $A_4$ 中的任意一个 3-轮换 $\tau = (a\ b\ c)$。
   由上述推导，必有 $\tau^2 \in H$。
   根据 3-轮换的运算性质，$\tau^3 = (1) \implies \tau^2 = \tau^{-1}$。
   因此 $\tau^{-1} \in H$。因为 $H$ 是子群，对求逆封闭，所以：
   $$\tau = (\tau^{-1})^{-1} \in H$$
   这表明：$A_4$ 中的所有 3-轮换都必须属于子群 $H$。
4. **元素计数矛盾**：
   在 $A_4$ 中，3-轮换一共有 $\binom{4}{3} \times 2 = 8$ 个。
   加上单位元 $(1)$，$H$ 中至少必须包含 $8 + 1 = 9$ 个互不相同的元素：
   $$|H| \ge 9$$
   这与假设 $|H| = 6$ 矛盾。
因此假设不成立，$A_4$ 绝无 6 阶子群。 $\blacksquare$

---

## 4. 正规子群（Normal Subgroup）

### 4.1 严格定义
设 $N$ 是群 $G$ 的子群。如果对任意 $g \in G$，都有：
$$g N g^{-1} = N$$
（或者等价地：$\forall g \in G, \forall n \in N \implies g n g^{-1} \in N$），
则称 $N$ 是群 $G$ 的**正规子群（Normal Subgroup，或不变子群）**，记作：
$$N \triangleleft G$$

### 4.2 等价判据定理

#### 定理 3.9
设 $N \le G$。下列条件等价：
1. $N \triangleleft G$；
2. $\forall g \in G$，$g N g^{-1} \subseteq N$；
3. $\forall g \in G$，$gN = Ng$（左陪集等于右陪集）；
4. $\forall g \in G$，$gN g^{-1} = N$。

**证明：**
- $1 \iff 2$：若 $\forall g \in G, gNg^{-1} \subseteq N$。任取 $g \in G$，以 $g^{-1}$ 代替 $g$，有 $g^{-1}N(g^{-1})^{-1} \subseteq N \implies g^{-1}Ng \subseteq N$。
  两边左乘 $g$、右乘 $g^{-1}$，得 $N \subseteq gNg^{-1}$。结合两式即得 $gNg^{-1} = N$。
- $1 \iff 3$：在 $gNg^{-1} = N$ 两边右乘 $g$，由结合律直接化为 $gN = Ng$。 $\blacksquare$

### 4.3 指数为 2 的正规性定理

#### 定理 3.10
若子群 $H \le G$ 满足指数 $[G : H] = 2$，则 $H$ 必为 $G$ 的正规子群（$H \triangleleft G$）。

**证明：**
验证左陪集是否等于右陪集：
任取 $g \in G$：
- 若 $g \in H$：由子群封闭性，$gH = H = Hg$。
- 若 $g \notin H$：因为指数 $[G : H] = 2$，全群只能划分成两个互不相交的左陪集，其中一个是平凡陪集 $H$。因此另一个左陪集必为补集：
  $$gH = G \setminus H$$
  同理，全群也只能划分成两个互不相交的右陪集，故右陪集也必为补集：
  $$Hg = G \setminus H$$
  两者完全相同：
  $$gH = Hg$$
综上，对一切 $g \in G$ 均有 $gH = Hg$，故 $H \triangleleft G$。 $\blacksquare$

---

## 5. 群的作用与轨道-稳定子定理

### 5.1 严格表述
设 $G$ 是群，$X$ 是非空集合。群 $G$ 在集合 $X$ 上的一个**作用（Group Action）**是指一个映射 $\cdot: G \times X \to X$，满足：
1. $\forall x \in X$，$e \cdot x = x$；
2. $\forall g_1, g_2 \in G, \forall x \in X$，$(g_1 g_2) \cdot x = g_1 \cdot (g_2 \cdot x)$。

在此作用下，定义两个核心对象：
- **轨道（Orbit）**：点 $x$ 在群操作下能达到的全体目标点集合：
  $$\operatorname{Orb}(x) = \{g \cdot x \mid g \in G\} \subseteq X$$
- **稳定子（Stabilizer）**：所有保持点 $x$ 保持不动的群元素集合：
  $$\operatorname{Stab}(x) = \{g \in G \mid g \cdot x = x\} \subseteq G$$

#### 引理 3.11
对任意 $x \in X$，$\operatorname{Stab}(x)$ 是群 $G$ 的子群（$\operatorname{Stab}(x) \le G$）。

**证明：**
1. $e \cdot x = x \implies e \in \operatorname{Stab}(x)$，非空。
2. 任取 $a, b \in \operatorname{Stab}(x)$。则 $a \cdot x = x, b \cdot x = x$。
   在 $b \cdot x = x$ 两边作用 $b^{-1}$，得 $b^{-1} \cdot x = x$。
   则 $(ab^{-1}) \cdot x = a \cdot (b^{-1} \cdot x) = a \cdot x = x$。
   故 $ab^{-1} \in \operatorname{Stab}(x)$。由一步判定法，$\operatorname{Stab}(x) \le G$。 $\blacksquare$

### 5.2 轨道-稳定子定理（Orbit-Stabilizer Theorem）

#### 定理 3.12
设有限群 $G$ 作用在集合 $X$ 上。对于任意 $x \in X$：
$$|G| = |\operatorname{Orb}(x)| \times |\operatorname{Stab}(x)|$$
即：轨道的大小等于稳定子群在 $G$ 中的指数：
$$|\operatorname{Orb}(x)| = [G : \operatorname{Stab}(x)]$$

**证明：**
记 $H = \operatorname{Stab}(x)$。
> **特别说明**：记号 $G/H = \{gH \mid g \in G\}$ 在此处**仅表示子群 $H$ 在 $G$ 中的左陪集集合**。因为 $H$ 不一定是正规子群，所以此处 $G/H$ **不是商群**，只作为一个普通的商集合。

构造从左陪集集合 $G/H$ 到轨道 $\operatorname{Orb}(x)$ 的映射：
$$\Psi: G/H \to \operatorname{Orb}(x), \quad \Psi(gH) = g \cdot x$$
1. **良定性与单射性**：
   设 $g_1, g_2 \in G$。根据定理 3.2：
   $$g_1 H = g_2 H \iff g_1^{-1} g_2 \in H = \operatorname{Stab}(x)$$
   $$\iff (g_1^{-1} g_2) \cdot x = x \iff g_2 \cdot x = g_1 \cdot x \iff \Psi(g_1 H) = \Psi(g_2 H)$$
   正向推导证明了映射 $\Psi$ 的**良定性**（取值与代表元选取无关）；
   逆向推导证明了 $\Psi$ 的**单射性**。
2. **满射性**：
   任取轨道中的点 $y \in \operatorname{Orb}(x)$，由轨道定义，存在 $g \in G$ 使得 $g \cdot x = y$。
   从而 $\Psi(gH) = g \cdot x = y$。故 $\Psi$ 是满射。
综上，$\Psi$ 是双射。因此：
$$|\operatorname{Orb}(x)| = |G/H| = [G : \operatorname{Stab}(x)]$$
再由 Lagrange 定理 $|G| = [G : H] \cdot |H|$，代入即得：
$$|G| = |\operatorname{Orb}(x)| \times |\operatorname{Stab}(x)| \quad \blacksquare$$

---

## 6. 核心易错点

1. **陪集判定的左逆次序**：左陪集相等是 $a^{-1}b \in H$，而非 $ab^{-1} \in H$（后者对应右陪集相等 $Ha = Hb$）。
2. **陪集与子群的区别**：陪集 $aH$ 通常不含单位元，因而通常不是子群；当且仅当 $a \in H$ 时，$aH = H$ 才是子群。
3. **正规子群判定的左右颠倒**：$gN = Ng$ 并不要求群元素满足逐点交换 $gn = ng$；它表示的是集合相等，即对任意 $n \in N$，存在 $n' \in N$ 使得 $gn = n'g$。
4. **拉格朗日逆命题误区**：不能认为只要 $d$ 整除群阶就一定存在 $d$ 阶子群，例如 $A_4$ 没有 6 阶子群。

---

## 7. 前后知识连接

- **前置依赖**：集合等价关系与划分（[00-集合论与映射](/posts/obsidian/00-%E9%9B%86%E5%90%88%E8%AE%BA%E4%B8%8E%E6%98%A0%E5%B0%84/)）、子群一步判定、阿贝尔群交换性（[01-群与子群.md](/posts/obsidian/01-%E7%BE%A4%E4%B8%8E%E5%AD%90%E7%BE%A4/)）。
- **向后驱动**：
  - 正规子群是构造商群（[04-商群与同态.md](/posts/obsidian/04-%E5%95%86%E7%BE%A4%E4%B8%8E%E5%90%8C%E6%80%81/)）的先决条件。
  - $a^{-1}b \in N$ 是证明商群乘法良定性与第一同构定理双射性（[05-三大同构定理.md](/posts/obsidian/05-%E4%B8%89%E5%A4%A7%E5%90%8C%E6%9E%84%E5%AE%9A%E7%90%86/)）的核心工具。
  - 轨道-稳定子定理是后续证明 Cayley 定理与内自同构群（[06-置换群-内自同构-Cayley.md](/posts/obsidian/06-%E7%BD%AE%E6%8D%A2%E7%BE%A4-%E5%86%85%E8%87%AA%E5%90%8C%E6%9E%84-cayley/)）的理论基石。
- **易错与证明套路**：参见 [90-易错点与证明套路.md](/posts/obsidian/90-%E6%98%93%E9%94%99%E7%82%B9%E4%B8%8E%E8%AF%81%E6%98%8E%E5%A5%97%E8%B7%AF/)（易错点 8 Lagrange 逆命题反例、模板 5 指数为 2 子群必正规证明法）。

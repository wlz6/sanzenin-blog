---
title: 现代 CMake 实用笔记（面向 C++ 与 AI Infra）
published: 2026-09-16
description: 这份笔记总结自小彭老师的课程及实际工程经验，删掉了冷门复杂的语法，只保留做 C++ 开发和 AI Infra（算子、推理引擎、CUDA 开发）必须掌握的核心内容。 很多人初学时容易把 CMake 和编译器搞混： - g++ / clang++ / nvcc 才是真正的编译器，负责把代码编译成汇编和机器码。 - CMak
image: ""
tags:
  - ai infra
  - Obsidian
category: ai infra
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# 现代 CMake 实用笔记（面向 C++ 与 AI Infra）

这份笔记总结自小彭老师的课程及实际工程经验，删掉了冷门复杂的语法，只保留做 C++ 开发和 AI Infra（算子、推理引擎、CUDA 开发）必须掌握的核心内容。

---

## 0. 搞懂 CMake 的角色：它到底在干什么？

很多人初学时容易把 CMake 和编译器搞混：
- **g++ / clang++ / nvcc** 才是真正的编译器，负责把代码编译成汇编和机器码。
- **CMake 本身不编译任何代码**。它是一个“生成配置的工具”。你写一份跨平台的 `CMakeLists.txt`，在 Linux 上它帮你生成 Makefile 或 `build.ninja`，在 Windows 上它生成 VS 工程，然后再调用底层的 `make`、`ninja` 或 `cl.exe` 去真正编译。

从 CMake 3.x 开始，官方推崇所谓的 **“现代 CMake”（Modern CMake）**。核心区别只有一句话：
> **别再用全局变量了，一切围绕目标（Target）来配置。**

每个可执行文件（exe）或库（lib）就是一个 Target。头文件路径、宏定义、编译选项都是绑定在具体 Target 上的属性，通过 `PUBLIC` / `PRIVATE` 控制要不要传给别人。

---

## 1. 标准构建命令：别再手动 mkdir build 了

老教程经常教这种写法：
```bash
mkdir build && cd build
cmake ..
make -j
cd ..
```
这种写法既繁琐，又容易污染目录。**现代 CMake 推荐统一使用 `-B` 和 `--build`：**

```bash
# 1. 配置阶段：自动创建 build 目录并生成构建文件
cmake -B build -DCMAKE_BUILD_TYPE=Release

# 2. 编译阶段：跨平台通用，自动调用底层 make 或 ninja，自动多核编译
cmake --build build -j$(nproc)
```
无论在 Linux、macOS 还是 Windows 下，这两条命令完全一致。

---

## 2. 最基础的项目怎么写？

新建一个项目，根目录下放一个 `CMakeLists.txt`，最小可用骨架如下：

```cmake
# 声明最低版本要求（建议 >= 3.18，对 CUDA 和新特性的支持比较完善）
cmake_minimum_required(VERSION 3.18)

# 声明项目名字和用到的语言（纯 C++ 项目指明 CXX）
project(my_project LANGUAGES CXX)

# 设置 C++ 标准
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)  # 必须加上，防止编译器默默降级到旧标准
set(CMAKE_CXX_EXTENSIONS OFF)        # 关掉 GCC 专有的 gnu++17 扩展，保证代码跨平台

# 生成可执行文件
add_executable(my_app main.cpp other.cpp)
```

---

## 3. 源文件怎么组织？

### 推荐：直接列出文件名
```cmake
add_executable(my_app
    main.cpp
    utils.cpp
    utils.h
)
```
> **提示**：头文件 `.h` 虽然不参与编译，但也写进 target 里，这样在 VS Code / CLion / Visual Studio 的左侧工程树里能直接看到头文件，跳转更方便。

### 偷懒写法：通配符的坑
很多人喜欢用 `file(GLOB ...)` 自动搜集目录下所有文件：
```cmake
# ⚠️ 错误示范：千万别这么写
file(GLOB sources *.cpp *.h)
add_executable(my_app ${sources})
```
**坑在哪里？**
当你新建或删除了一个 `.cpp` 文件，因为 `CMakeLists.txt` 本身没变，执行 `cmake --build build` 时 CMake 不会感知到新文件，导致新代码根本没编进去。

**正确写法：加上 `CONFIGURE_DEPENDS`**
```cmake
file(GLOB sources CONFIGURE_DEPENDS *.cpp *.h)
add_executable(my_app ${sources})
```
加了这个参数，底层构建系统每次编译前都会去扫一眼文件系统，发现文件增删会自动重新跑一遍 CMake。

---

## 4. 拆分模块与构建库（Library）

做稍大一点的工程，一般把核心代码编成库，上层应用去链接它。

```cmake
# 编译静态库（Linux 下出 .a，Windows 下出 .lib）
add_library(tensor_lib STATIC src/tensor.cpp)

# 编译动态库（Linux 下出 .so，Windows 下出 .dll）
add_library(tensor_lib SHARED src/tensor.cpp)
```

### 技巧 1：让外部决定编静态库还是动态库
不写 `STATIC` 也不写 `SHARED`：
```cmake
add_library(tensor_lib src/tensor.cpp)
```
CMake 会根据变量 `BUILD_SHARED_LIBS` 自动判断。在命令行执行时可以灵活切换：
```bash
cmake -B build -DBUILD_SHARED_LIBS=ON   # 编出 .so
cmake -B build -DBUILD_SHARED_LIBS=OFF  # 编出 .a
```

### 技巧 2：静态库被动态库链接时的 `-fPIC` 报错
如果静态库 `A` 后续要被链接进动态库 `B`（或者给 Python 做 `.so` 扩展），Linux 链接器会报错要求用 `-fPIC`。
在 CMake 里给静态库加上这一行即可：
```cmake
set_property(TARGET A PROPERTY POSITION_INDEPENDENT_CODE ON)
```

---

## 5. 最核心的概念：PUBLIC、PRIVATE、INTERFACE

这是初学 CMake 最容易懵的地方。其实它的本质就是**定义属性传递的范围**。

当你给一个库配置头文件目录、链接依赖或编译选项时，用这三个关键字控制：

| 关键字 | 自己编译时用不用？ | 别人链接我时能拿到吗？ | 通俗理解 | 常见场景 |
| :--- | :--- | :--- | :--- | :--- |
| **`PRIVATE`** | **用** | **不给别人** | 内部自用，关起门来自己用 | 内部实现代码、最终的可执行程序 |
| **`INTERFACE`**| **不用** | **专门给别人** | 纯接口转发，自己不编 | 纯头文件库（Header-only）、导入目标 |
| **`PUBLIC`** | **用** | **也给别人** | 对外公开接口，一人一份 | 你的公共头文件引用了外部依赖 |

### 实际案例：头文件路径自动传递
假设目录结构如下：
```text
tensor_lib/
├── include/
│   └── tensor.h    # 对外暴露的头文件
└── src/
    └── tensor.cpp  # 具体实现
```

在配置 `tensor_lib` 时：
```cmake
add_library(tensor_lib STATIC src/tensor.cpp)

# 设置为 PUBLIC：告诉 CMake，不仅我编译要搜 include 目录，谁链接我，谁也自动搜 include 目录
target_include_directories(tensor_lib PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/include")
```

在可执行程序里：
```cmake
add_executable(bench_app main.cpp)
target_link_libraries(bench_app PRIVATE tensor_lib)
```

这时候在 `main.cpp` 里直接写 `#include "tensor.h"` 就能通过编译！
你不需要再给 `bench_app` 重复配置路径，CMake 会把 `tensor_lib` 上标为 `PUBLIC` 的属性一路传染给 `bench_app`。

---

## 6. 如何引入第三方库？

日常开发中碰到的第三方库主要有三类引入方式：

### 方式 1：纯头文件库（Header-only，比如 glm、nlohmann/json）
这种库不需要编译，直接把它的 `include` 路径挂到你的 Target 上就行：
```cmake
target_include_directories(my_app PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/third_party/glm/include")
```

### 方式 2：源码作为子目录引入（比如 fmt）
把第三方库源码放到项目的子目录里（通常通过 git submodule），然后用 `add_subdirectory`：
```cmake
add_subdirectory(third_party/fmt)

add_executable(my_app main.cpp)
target_link_libraries(my_app PRIVATE fmt::fmt)
```

### 方式 3：系统安装好的库（使用 `find_package`）
系统或者包管理器里装好的库，用 `find_package` 寻找：
```cmake
find_package(TBB REQUIRED)
target_link_libraries(my_app PRIVATE TBB::tbb)
```
- `REQUIRED` 表示如果找不到就直接报错停下来，不要继续。
- 像 `TBB::tbb` 这种带双冒号的名字叫 **Imported Target（导入目标）**。它把 `.so` 路径、头文件路径、编译参数全打包在一起了，只要 link 它，所有依赖全自动配齐。

---

## 7. find_package 的两种模式：Module 还是 Config？

很多人被 `FindXXX.cmake` 和 `XXXConfig.cmake` 搞晕过，区别其实很简单：

1. **Module 模式（默认）**：
   - 找的是 `Find<Name>.cmake`。
   - 这是 CMake 官方或你自己写的一个探测脚本，负责满系统乱翻找路径。
   - 相当于“找外面的私家侦探帮你去翻系统目录”。
2. **Config 模式（推荐，加 `CONFIG` 关键字）**：
   - 找的是 `<Name>Config.cmake` 或 `<name>-config.cmake`。
   - 这是第三方库自己安装到系统里的，库作者最清楚库的位置和参数。
   - 相当于“直接读该库官方提供的说明书”。

```cmake
# 优先推荐指定 CONFIG（如果该库提供了的话）
find_package(TBB CONFIG REQUIRED)
```

### 搭配包管理器（vcpkg / Conan）
如果用 vcpkg 安装了库，执行 CMake 时带上它的工具链参数即可，CMake 脚本本身一行都不用改：
```bash
cmake -B build -DCMAKE_TOOLCHAIN_FILE="/path/to/vcpkg/scripts/buildsystems/vcpkg.cmake"
```

---

## 8. 变量、Cache 与 option 开关

### 普通变量 vs 缓存变量
- `set(MY_VAR "123")`：普通局部变量，CMake 退出后就没了。
- `set(MY_VAR "123" CACHE STRING "说明")`：写进 `build/CMakeCache.txt` 里的缓存变量，下次执行 CMake 依然在，可以在命令行用 `-DMY_VAR=xxx` 覆盖。

### 制作命令行开关：`option()`
这是给项目做配置项的标准方式：
```cmake
option(ENABLE_TESTS "是否编译测试程序" ON)
option(WITH_CUDA    "是否开启 CUDA 加速" OFF)

if (ENABLE_TESTS)
    add_subdirectory(tests)
endif()
```
用户在命令行就能很方便地开关功能：
```bash
cmake -B build -DENABLE_TESTS=OFF -DWITH_CUDA=ON
```

---

## 9. AI Infra 核心：OpenMP 与 CUDA 异构编译

在做深度学习推理框架、算子优化时，最常打交道的就是 CPU 多线程与 GPU 编译。

### 9.1 OpenMP 并行支持（CPU 算子加速）
别再去手动写 `-fopenmp`，现代 CMake 写法极其干净：
```cmake
find_package(OpenMP REQUIRED)

add_executable(vec_bench main.cpp)
# 只要链接这一行，编译参数、运行库依赖全部自动补齐
target_link_libraries(vec_bench PRIVATE OpenMP::OpenMP_CXX)

# 配合 CPU 算子极限优化：开启 O3 和本地 CPU 架构向量化（AVX2/AVX-512）
target_compile_options(vec_bench PRIVATE -O3 -march=native)
```

### 9.2 原生 CUDA 支持（GPU 算子开发）
> ⚠️ **警告**：老旧教程里教的 `find_package(CUDA)` 和 `cuda_add_executable` 早在 CMake 3.10+ 就被**废弃**了，新项目绝对不要用。

现代做法是把 CUDA 当成原生语言：

```cmake
cmake_minimum_required(VERSION 3.18)

# 1. 声明开启 CXX 和 CUDA 语言（CMake 会自动检测系统的 nvcc）
project(cuda_ops LANGUAGES CXX CUDA)

# 2. 保证 C++ 与 CUDA 语言标准一致
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CUDA_STANDARD 17)

# 3. 混合添加 .cpp 和 .cu 文件
add_library(attn_ops SHARED
    src/interface.cpp
    src/kernel.cu
)

# 4. 指定目标 GPU 架构（计算能力）
# 本地调试用 native 自动识别本机显卡（如 4060 会自动识别为 89）：
set_property(TARGET attn_ops PROPERTY CUDA_ARCHITECTURES native)

# 如果要发布库支持多种显卡（fatbin），显式指定多个算力：
# 80(A100), 89(4090/4060), 90(H100)
# set_property(TARGET attn_ops PROPERTY CUDA_ARCHITECTURES 80 89 90)
```
CMake 会自动把 `.cpp` 给 GCC 编，把 `.cu` 给 nvcc 编，最后把它们和 CUDA 运行时（`libcudart`）自动链接在一起。

---

## 10. 常见报错快速排查套路

### 1. `fatal error: xxx.h: No such file or directory`
- **原因**：找不到头文件。
- **排查**：
  1. 看提供头文件的库有没有写 `target_include_directories(库名 PUBLIC 路径)`。
  2. 看你的目标有没有通过 `target_link_libraries(你的目标 PRIVATE 库名)` 连上去。

### 2. `undefined reference to 'xxx'` 或 `LNK2019`
- **原因**：头文件找到了（函数声明有了），但链接器找不到函数实现的机器码。
- **排查**：
  1. 实现这个函数的 `.cpp` 是不是忘了写进 `add_library` 或 `add_executable`？
  2. 是不是只包含了头文件，忘了用 `target_link_libraries` 链接第三方库的 `.a` / `.so`？

### 3. `error while loading shared libraries: libxxx.so`
- **原因**：编译链接都成功了，但程序**运行时**动态链接器找不到 `.so`。
- **排查**：
  - 临时解决：`export LD_LIBRARY_PATH=/path/to/lib:$LD_LIBRARY_PATH`。
  - CMake 优雅解决：设置 RPATH，把库路径写进二进制文件：
    ```cmake
    set_target_properties(my_app PROPERTIES BUILD_RPATH "${CMAKE_CURRENT_BINARY_DIR}")
    ```

### 4. `No CUDA toolchain found`
- **原因**：CMake 找不到 `nvcc`。
- **排查**：检查环境变量 `export PATH=/usr/local/cuda/bin:$PATH`，确认终端里敲 `nvcc --version` 能正常输出。

---

## 总结：牢记这 5 条守则

1. 构建只用两行：`cmake -B build` 和 `cmake --build build`。
2. 尽量少用全局变量，属性都挂到具体 **Target** 上（`target_*` 系列命令）。
3. 区分好 **`PUBLIC`**（别人要用）和 **`PRIVATE`**（仅自己用）。
4. 搜源文件用 `file(GLOB ... CONFIGURE_DEPENDS)` 防止新增文件无法感知。
5. 引入外部依赖优先认准带双冒号的 **Imported Target**（如 `OpenMP::OpenMP_CXX`、`TBB::tbb`），省去手动配参数的麻烦。

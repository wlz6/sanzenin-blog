---
title: Go 新手入门：用 Gin + GORM 写第一个 CRUD 服务
published: 2026-05-27
description: 从零搭建一个用户注册/更新/删除的 HTTP 服务，适合刚学完 Go 基础语法的纯新手。 做一个最简单的用户管理系统，三个接口：/user/register（注册）、/user/update（修改密码）、/user/delete（删除用户）。 请求用 POST 表单，返回 JSON，数据存 MySQL。 技术栈：Gin
image: ""
tags:
  - GO全栈开发
  - Obsidian
category: GO全栈开发
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# Go 新手入门：用 Gin + GORM 写第一个 CRUD 服务

> 从零搭建一个用户注册/更新/删除的 HTTP 服务，适合刚学完 Go 基础语法的纯新手。


## 一、前言：我们要做什么

做一个最简单的用户管理系统，三个接口：`/user/register`（注册）、`/user/update`（修改密码）、`/user/delete`（删除用户）。

请求用 POST 表单，返回 JSON，数据存 MySQL。

技术栈：**Gin**（HTTP 框架） + **GORM**（ORM 框架） + **MySQL**。

代码分为两个学习阶段：

- **class2**：用 GORM 直接操作数据库，理解 Go 的 struct、指针、错误处理

- **class3**：加入 Gin 框架，拆成 controller → services → dao 三层架构



## 二、class2：GORM 入门，直接用代码操作数据库

### 2.1 完整代码

```go

package main



import (

    "fmt"

    "time"

    "gorm.io/driver/mysql"

    "gorm.io/gorm"

)



type User struct {

    ID        uint      `gorm:"primaryKey"`

    UserName  string    `gorm:"size:64;uniqueIndex;not null"`

    Password  string    `gorm:"size:128"`

    CreatedAt time.Time `gorm:"autoCreateTime"`

}



func main() {

    dsn := "root:123456@tcp(127.0.0.1:3306)/testdb?charset=utf8mb4&parseTime=True&loc=Local"

    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})

    if err != nil {

        panic("数据库连接失败: " + err.Error())

    }

    db.AutoMigrate(&User{})



    // Create 创建

    newUser := User{UserName: "wlz", Password: "wlz"}

    db.Create(&newUser)

    fmt.Println("创建成功, ID:", newUser.ID)



    // Read 查询

    var user User

    db.Where("user_name=?", "wlz").First(&user)

    fmt.Printf("查询结果: %+v\n", user)



    // Update 更新

    db.Model(&user).Update("Password", "123")

    fmt.Printf("更新后: %+v\n", user)



    // Delete 删除

    db.Delete(&user)

}

```

### 2.2 逐段讲解

**struct 和 tag**

```go

type User struct {

    ID        uint      `gorm:"primaryKey"`

    UserName  string    `gorm:"size:64;uniqueIndex;not null"`

    Password  string    `gorm:"size:128"`

    CreatedAt time.Time `gorm:"autoCreateTime"`

}

```

`struct` 是 Go 里的"数据类"，把多个字段打包在一起。字段名大写开头表示"导出"（跨包可见）。

反引号 `` ` `` 里的是 **tag**（标签），它不影响编译，是运行时的"元数据"。GORM 靠反射读到这些 tag，自动把 `UserName` 映射为数据库的 `user_name` 列，`primaryKey` 表示主键，`uniqueIndex` 表示唯一索引。没有 tag 也行，GORM 会用默认规则（蛇形命名）推断列名。



**连接数据库**

```go

dsn := "root:123456@tcp(127.0.0.1:3306)/testdb?charset=utf8mb4&parseTime=True&loc=Local"

db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})

if err != nil {

    panic("数据库连接失败: " + err.Error())

}

```

DSN 就是一串连接信息，格式固定为 `用户名:密码@tcp(IP:端口)/数据库名?参数`。

`gorm.Open` 返回两个值：`*gorm.DB` 类型的数据库句柄和 `error`。Go 没有 try-catch，错误就是普通的返回值，约定放在最后一位。**这里必须检查 err**：如果数据库没启动或密码错了，`db` 是 `nil`，后面任何 `db.xxx` 调用都会 panic（空指针异常）。



**AutoMigrate 自动建表**

```go

db.AutoMigrate(&User{})

```

GORM 读取 `User` struct 的定义，自动在数据库里创建对应的 `users` 表（表名 = 结构体名变为蛇形复数）。如果表已存在但结构变了（比如加了个字段），会自动添加新列。**不会删除已有列**，所以是安全的。

注意传的是 `&User{}`——一个空结构体的**指针**。在 Go 里，`&x` 取变量 x 的内存地址，得到的是一个指针。GORM 需要指针来把查询结果写回变量。



**CRUD 四个操作**

```go

// Create：传入指针，GORM 会把自增 ID 回写到 newUser.ID

db.Create(&newUser)



// Read：Where 指定条件，First 查第一条，结果写入 user

var user User

db.Where("user_name=?", "wlz").First(&user)



// Update：Model 指定要改哪条记录，Update 改单个字段

db.Model(&user).Update("Password", "123")



// Delete：按主键删

db.Delete(&user)

```

重点：`Where("user_name=?", "wlz")` 里的 `?` 是**占位符**，GORM 会自动把 `"wlz"` 转义后填入，防止 SQL 注入。**第一个参数里的列名必须是数据库的真实列名**（`user_name`），不是 Go 的字段名（`UserName`）。这是新手最容易踩的坑：GORM 映射规则是大驼峰 → 蛇形，`UserName` → `user_name`，写 `name` 就报错。

`First(&user)` 这里 `user` 已经声明为 `User` 类型，传 `&user` 是正确的一级取址（得到 `*User`）。后面 class3 会看到传错的情况。



## 三、class3：引入 Gin 框架，拆成三层架构

class2 把 SQL 逻辑和业务逻辑全混在 `main.go` 里，真实项目不会这样写。class3 把它拆成三层：

```

HTTP 请求 → controller（接收请求、返回 JSON）

                ↓

            services（业务逻辑：检查用户是否存在、校验密码）

                ↓

            dao（纯数据库 CRUD，封装 GORM）

```

### 3.1 dao 层 — 封装数据库操作

```go

package dao



import "gorm.io/gorm"



type User struct {

    ID       int    `gorm:"primaryKey"`

    UserName string `gorm:"size:64;uniqueIndex"`

    Password string `gorm:"size:64"`

}



var DB *gorm.DB



func Create(usr *User) error {

    return DB.Create(usr).Error

}

func GetByName(name *string) (Usr *User, err error) {

    err = DB.Where("user_name = ?", name).First(&Usr).Error  // 注意这里的 bug

    return

}

func DeleteByname(name *string) error {

    return DB.Where("user_name = ?", name).Delete(&User{}).Error

}

func Update(usr *User) error {

    return DB.Save(usr).Error

}

```

dao 包只做一件事：把 GORM 操作封装成函数，对外隐藏 SQL 细节。

`var DB *gorm.DB` 是一个包级变量，`main.go` 连接数据库后把句柄赋给它（`dao.DB = db`），这叫**依赖注入**——dao 不自己连数据库，靠外部"注射"进来。好处是 main 里只连一次，各层共享同一个连接池。坏处是全局变量不利于单元测试，但对学习项目足够了。

**命名返回值** `(Usr *User, err error)` 值得注意：返回值在函数签名里就起了名字，函数体内直接 `return` 就行，Go 自动返回这两个变量的当前值。另一个写法是 `return usr, err` 显式返回，效果一样。

**指针 bug 现场**：`First(&Usr)` 这里 `Usr` 声明时已经是 `*User`（指向 User 的指针），再取址 `&Usr` 就变成了 `**User`（指向指针的指针）。GORM 的 `First` 期望 `*User`，传 `**User` 会出错。正确写法是 `First(Usr)`。为什么 class2 里 `var user User; First(&user)` 是对的？因为 `user` 是 `User` 值类型，取址一次得到 `*User`，刚好匹配。这个区别是 Go 新手最容易搞混的地方之一。



### 3.2 services 层 — 业务逻辑

```go

package services



import (

    "class3/dao"

    "errors"

)



func Register(name, passwd string) error {

    if _, err := dao.GetByName(&name); err == nil {

        return errors.New("用户已存在")

    }

    return dao.Create(&dao.User{UserName: name, Password: passwd})

}

func UpdatePasswd(name, NewPasswd string) error {

    usr, err := dao.GetByName(&name)

    if err != nil {

        return errors.New("用户不存在")

    }

    usr.Password = NewPasswd

    return dao.Update(usr)

}

func Delete(name, passwd string) error {

    return dao.DeleteByname(&name)

}

```

services 是"业务规则层"，它不碰 HTTP 也不碰 GORM。以 `Register` 为例：先调用 `dao.GetByName` 查用户是否存在，如果 **err == nil**（没报错，说明查到了），就返回"用户已存在"；如果 **err != nil**（查询失败/没找到），就调用 `dao.Create` 创建。注意 `if _, err := ...` 里的 `_` 是空白标识符，表示"这个返回值我不需要"，这里我们只关心 err 不关心查到的 User 对象。

`errors.New("...")` 是 Go 标准库创建错误的方式，返回一个 `error` 接口类型的值。



### 3.3 controller 层 — 接收 HTTP 请求

```go

package controller



import (

    "class3/services"

    "github.com/gin-gonic/gin"

)



func Register(g *gin.Context) {

    name, passwd := g.PostForm("name"), g.PostForm("pwd")

    if err := services.Register(name, passwd); err != nil {

        g.JSON(400, gin.H{"error": err.Error()})

        return  // 必须 return！否则会继续执行下面的 g.JSON(200, ...)

    }

    g.JSON(200, gin.H{"message": "注册成功"})

}

func Update(g *gin.Context) {

    name, passwd := g.PostForm("name"), g.PostForm("pwd")

    if err := services.UpdatePasswd(name, passwd); err != nil {

        g.JSON(400, gin.H{"error": err.Error()})

        return

    }

    g.JSON(200, gin.H{"message": "更新密码成功"})

}

func Delete(g *gin.Context) {

    name, passwd := g.PostForm("name"), g.PostForm("pwd")

    if err := services.Delete(name, passwd); err != nil {

        g.JSON(400, gin.H{"error": err.Error()})

        return

    }

    g.JSON(200, gin.H{"message": "删除成功"})

}

```

每个 handler 函数签名为 `func HandlerName(c *gin.Context)`，`*gin.Context` 是 Gin 封装的"一次请求-响应"上下文，通过它可以读请求参数、写响应。

`g.PostForm("name")` 读取 HTTP POST 表单中 `name` 字段的值。表单格式是 `application/x-www-form-urlencoded`，即 `key1=val1&key2=val2`。

`g.JSON(200, gin.H{...})` 把 Go 的 map 序列化为 JSON 写回客户端。`gin.H` 其实就是 `map[string]any` 的类型别名，`any` 是 `interface{}` 的别名（Go 1.18+），表示任意类型。

**最重要的细节**：每个错误分支的 `g.JSON(400, ...)` 后面必须跟 `return`。Go 不像 Python/Ruby 那样一个 `return` 就退出函数，如果没有 `return`，程序会继续走到后面的 `g.JSON(200, ...)`，往同一个响应里写两次数据，Gin 会报 warning 且客户端收到的内容不可预期。



### 3.4 main.go — 组装启动

```go

package main



import (

    "class3/controller"

    "class3/dao"

    "github.com/gin-gonic/gin"

    "gorm.io/driver/mysql"

    "gorm.io/gorm"

)



func main() {

    dsn := "root:123456@tcp(127.0.0.1:3306)/testdb?parseTime=true"

    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})

    if err != nil {

        panic(err)

    }

    db.AutoMigrate(&dao.User{})

    dao.DB = db



    r := gin.Default()

    r.POST("/user/register", controller.Register)

    r.POST("/user/update", controller.Update)

    r.POST("/user/delete", controller.Delete)

    r.Run(":8080")

}

```

`main.go` 是"组装车间"：连数据库 → 自动建表 → 把 db 注入 dao → 注册路由 → 启动服务。

`gin.Default()` 创建一个路由引擎，自带 Logger（打印每个请求）和 Recovery（handler panic 时自动恢复，不会崩进程）两个中间件。

`r.POST("/user/register", controller.Register)` 意思是：当收到 `POST /user/register` 时，调用 `controller.Register` 函数。**这里只传函数名不调用它**（没有括号），因为把函数本身注册给了 Gin，Gin 会在请求到来时帮我们调用。

`r.Run(":8080")` 启动 HTTP 服务器监听 8080 端口，这是一个阻塞调用，函数不会返回直到进程被终止。



## 四、用 wget 测试接口

服务启动后，用 wget 发 POST 请求测试：

```bash

# 注册（需绕过本地代理）

wget --no-proxy --content-on-error -qO- --post-data='name=tom&pwd=123456' http://127.0.0.1:8080/user/register

# 更新密码

wget --no-proxy --content-on-error -qO- --post-data='name=tom&pwd=newpass' http://127.0.0.1:8080/user/update

# 删除用户

wget --no-proxy --content-on-error -qO- --post-data='name=tom&pwd=123456' http://127.0.0.1:8080/user/delete

```

参数解释：

- `--post-data='key=val&...'`：发送 POST 表单（`application/x-www-form-urlencoded`），和 Gin 的 `PostForm` 对应

- `--no-proxy`：绕过系统代理（有的机器开了 Clash，127.0.0.1 也被代理劫持了）

- `--content-on-error`：4xx/5xx 也输出 body（默认 wget 收到错误码就不显示内容）

- `-qO-`：q 安静模式（不打印进度），O 输出到文件，`-` 是 stdout



## 五、常见坑点速查

**连接失败但 panic 空指针**

```go

db, _ := gorm.Open(...)   // 用 _ 吞掉错误，连接失败 db 就是 nil

db.AutoMigrate(&User{})   // nil.AutoMigrate() → panic

```

永远不要用 `_` 丢掉 `gorm.Open` 的错误。写 `db, err := ...; if err != nil { panic(err) }`。



**列名写错**

GORM 把 `UserName` 映射为 `user_name`，不是 `name`。写 SQL 条件时用数据库列名：

```go

DB.Where("user_name = ?", name)  // 对

DB.Where("name = ?", name)       // 错：数据库里没有 name 列

```

嫌列名太长可以加 tag 手动指定：`gorm:"column:name"`。



**指针取址层次搞混**

```go

var user User

DB.First(&user)       // user 是值类型, &user → *User ✓



var usr *User

DB.First(&usr)        // usr 是指针, &usr → **User ✗

DB.First(usr)         // 直接传, usr 已经是 *User ✓

```

判断方法：看变量声明时有没有 `*`。有 `*` 就不再加 `&`。



**controller 里忘记 return**

```go

g.JSON(400, gin.H{"error": "xxx"})  // 写完 400

// 没有 return，继续往下走

g.JSON(200, gin.H{"message": "ok"})  // 又写了 200，冲突

```

每次 `g.JSON` 后如果不想继续执行，必须加 `return`。

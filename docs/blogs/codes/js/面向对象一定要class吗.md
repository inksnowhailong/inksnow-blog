---
title: 前端抽象化，打破框架枷锁:面向对象思想一定要class吗？
date: 2025-6-4
categories:
 - 编程
 - 抽象前端，架构设计
tags:
 - 实验
---
**引言**
本次不讲某个示例了，我们来聚焦其核心理念在现代前端开发中的应用。

传统上，面向对象编程依赖类来组织代码，但随着React和Vue等现代框架的兴起，特别是Hook的普及，函数式编程逐渐占据主导。然而，这导致工程化设计被忽视，我认为这并非好事。前端开发迭代迅速，缺乏深思熟虑的设计会使代码受框架特性限制，难以适应新旧版本的不兼容问题（如React或Vue的API变更，应该很多前端都能明显感觉到），从而阻碍迭代升级。

本文将展示如何用TypeScript设计一个信息持久化的抽象结构，然后用Hook实现它，展示通过良好的工程设计，前端架构可以摆脱框架特性的限制，保持迭代升级的灵活性。无论是快速适配新的Hook，还是在未来Hook被淘汰时切换到其他范式，这种设计都能确保代码的适应性和可维护性。。

---

## 系统设计

我们将构建三个模块：

1. **Persistence Module**（持久化模块）：提供数据存储功能。
2. **Settings Module**（设置模块）：管理用户设置，依赖Persistence Module。
3. **SortedFavorites Module**（排序收藏模块）：管理用户收藏并根据设置排序，依赖Settings Module和Persistence Module。

## 模块抽象设计

首先，让我们用TypeScript接口来定义这些模块的抽象结构：

```typescript
/**
 * 持久化模块接口
 * 负责数据的存储和读取
 */
interface IPersistenceModule {
  /** 保存数据 */
  save<T>(key: string, data: T): Promise<void>;
  /** 读取数据 */
  load<T>(key: string): Promise<T | null>;
  /** 删除数据 */
  remove(key: string): Promise<void>;
}

/**
 * 设置模块接口
 * 管理用户设置，依赖持久化模块
 */
interface ISettingsModule {
  /** 获取设置 */
  getSetting<T>(key: string): Promise<T | null>;
  /** 更新设置 */
  updateSetting<T>(key: string, value: T): Promise<void>;
  /** 重置设置 */
  resetSettings(): Promise<void>;
}

/**
 * 收藏项类型
 */
interface FavoriteItem {
  /** 收藏ID */
  id: string;
  /** 收藏标题 */
  title: string;
  /** 收藏时间戳 */
  timestamp: number;
  /** 收藏数据 */
  data: unknown;
}

/**
 * 排序收藏模块接口
 * 管理用户收藏并根据设置排序
 */
interface ISortedFavoritesModule {
  /** 添加收藏 */
  addFavorite(item: FavoriteItem): Promise<void>;
  /** 获取排序后的收藏列表 */
  getSortedFavorites(): Promise<FavoriteItem[]>;
  /** 删除收藏 */
  removeFavorite(id: string): Promise<void>;
}

/**
 * 模块工厂接口
 * 用于创建各个模块的实例
 */
interface IModuleFactory {
  /** 创建持久化模块 */
  createPersistenceModule(): IPersistenceModule;
  /** 创建设置模块 */
  createSettingsModule(persistence: IPersistenceModule): ISettingsModule;
  /** 创建排序收藏模块 */
  createSortedFavoritesModule(
    persistence: IPersistenceModule,
    settings: ISettingsModule
  ): ISortedFavoritesModule;
}
```
### 类图 这个能让你更直观理解
@startuml
' 定义类型
interface FavoriteItem {
  + id: string
  + title: string
  + timestamp: number
  + data: unknown
}

' 定义接口
interface IPersistenceModule {
  + save<T>(key: string, data: T): Promise<void>
  + load<T>(key: string): Promise<T | null>
  + remove(key: string): Promise<void>
}

interface ISettingsModule {
  + getSetting<T>(key: string): Promise<T | null>
  + updateSetting<T>(key: string, value: T): Promise<void>
  + resetSettings(): Promise<void>
}

interface ISortedFavoritesModule {
  + addFavorite(item: FavoriteItem): Promise<void>
  + getSortedFavorites(): Promise<FavoriteItem[]>
  + removeFavorite(id: string): Promise<void>
}

interface IModuleFactory {
  + createPersistenceModule(): IPersistenceModule
  + createSettingsModule(persistence: IPersistenceModule): ISettingsModule
  + createSortedFavoritesModule(persistence: IPersistenceModule, settings: ISettingsModule): ISortedFavoritesModule
}

' 定义依赖关系
ISettingsModule ..> IPersistenceModule : 依赖
ISortedFavoritesModule ..> IPersistenceModule : 依赖
ISortedFavoritesModule ..> ISettingsModule : 依赖
IModuleFactory ..> IPersistenceModule : 创建
IModuleFactory ..> ISettingsModule : 创建
IModuleFactory ..> ISortedFavoritesModule : 创建

' 定义关联关系
ISortedFavoritesModule --> FavoriteItem : 使用

@enduml

这个设计采用了接口定义的方式，而不是传统的类继承。

接下来，我们将展示如何使用Hook来实现这些模块，证明面向对象的设计思想可以脱离类的束缚。


## hook方式的实现

下面我们使用 React Hook 来实现这些模块。为了简化示例，我们使用 localStorage 作为存储方式。

```typescript
/**
 * 持久化模块的 Hook 实现
 * 使用 localStorage 作为存储方式，实际项目中可以替换为其他存储方式
 */
const usePersistence = (): IPersistenceModule => {
  // 保存数据到 localStorage
  const save = async <T>(key: string, data: T): Promise<void> => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // 从 localStorage 读取数据
  const load = async <T>(key: string): Promise<T | null> => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  };

  // 从 localStorage 删除数据
  const remove = async (key: string): Promise<void> => {
    localStorage.removeItem(key);
  };

  return { save, load, remove };
};

/**
 * 设置模块的 Hook 实现
 * 依赖持久化模块来存储设置
 */
const useSettings = (persistence: IPersistenceModule): ISettingsModule => {
  // 获取设置值
  const getSetting = async <T>(key: string): Promise<T | null> => {
    return persistence.load<T>(`settings_${key}`);
  };

  // 更新设置值
  const updateSetting = async <T>(key: string, value: T): Promise<void> => {
    await persistence.save(`settings_${key}`, value);
  };

  // 重置所有设置
  const resetSettings = async (): Promise<void> => {
    // 获取所有设置键
    const keys = Object.keys(localStorage)
      .filter(key => key.startsWith('settings_'));
    // 删除所有设置
    await Promise.all(keys.map(key => persistence.remove(key)));
  };

  return { getSetting, updateSetting, resetSettings };
};

/**
 * 排序收藏模块的 Hook 实现
 * 依赖持久化模块存储收藏，依赖设置模块获取排序方式
 */
const useSortedFavorites = (
  persistence: IPersistenceModule,
  settings: ISettingsModule
): ISortedFavoritesModule => {
  // 添加收藏
  const addFavorite = async (item: FavoriteItem): Promise<void> => {
    const favorites = await persistence.load<FavoriteItem[]>('favorites') || [];
    favorites.push(item);
    await persistence.save('favorites', favorites);
  };

  // 获取排序后的收藏列表
  const getSortedFavorites = async (): Promise<FavoriteItem[]> => {
    const favorites = await persistence.load<FavoriteItem[]>('favorites') || [];
    const sortOrder = await settings.getSetting<'asc' | 'desc'>('sortOrder') || 'desc';

    // 根据时间戳排序
    return favorites.sort((a, b) =>
      sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
    );
  };

  // 删除收藏
  const removeFavorite = async (id: string): Promise<void> => {
    const favorites = await persistence.load<FavoriteItem[]>('favorites') || [];
    const newFavorites = favorites.filter(item => item.id !== id);
    await persistence.save('favorites', newFavorites);
  };

  return { addFavorite, getSortedFavorites, removeFavorite };
};

/**
 * 模块工厂的 Hook 实现
 * 负责创建和管理各个模块的实例
 */
const useModuleFactory = (): IModuleFactory => {
  // 创建各个模块实例
  const persistence = usePersistence();
  const settings = useSettings(persistence);
  const favorites = useSortedFavorites(persistence, settings);

  // 返回工厂方法
  return {
    createPersistenceModule: () => persistence,
    createSettingsModule: () => settings,
    createSortedFavoritesModule: () => favorites
  };
};
```

以上便是hook方式的实现，通过这种方式，我们实现了模块的解耦，并且可以很容易的进行单元测试。他没有用类编程，而是用函数编程，它既能让我们的程序依赖关系清晰且干净，又让我们使用了hook这种现代化框架特性。

## 这些本质是什么
既然面向对象编程没有必须用类，函数式编程是否必须用hook这种代码？是否必须要用现代框架的特性？当然也是否定的。
实现是可以快速迭代的，但是编程思想，设计模式等本质的东西是十分稳定、有效的。就像设计的一条原则："高层策略不应该依赖低层实现"。
至于hook,类，框架，都是工具，工具是用来实现思想的，而不是被思想所束缚。

## 总览

- "面向对象编程是对依赖关系进行控制，让高层策略和底层实现分开，让实现可以自由变化，而高层策略可以保持稳定。"
- "hook思想是让逻辑拆分为独立插件，可以在特定地方去组合使用，而无需更改其他部分逻辑"
- "函数式编程是对状态的修改进行了直接的限制，强调不可变性，无副作用让代码更易于理解和维护"







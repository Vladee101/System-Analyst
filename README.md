# System Analyst Simulator

Интерактивный симулятор для обучения и оценки навыков системного аналитика. Студент проходит реалистичные сценарии, принимает решения и получает обратную связь по ключевым компетенциям.

## Возможности

- 📋 **Сценарные симуляции** — пошаговые кейсы из реальной практики SA
- 🎯 **Оценка навыков** — автоматический подсчёт баллов по компетенциям (stakeholder communication, scope control, requirement quality и др.)
- 🔀 **Butterfly Effect** — ветвление сценария на основе ошибок студента
- ⚠️ **Consequence Banner** — визуальное предупреждение об отложенных последствиях решений
- 📊 **Артефакты** — интерактивные диаграммы (Mermaid), таблицы (RTM), ER-схемы
- 📈 **Результаты** — детальный dashboard с рекомендациями по улучшению
- 🕐 **Хронология** — лента событий, отражающая последствия решений

## Технологии

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Rust (Tauri v2)
- **Диаграммы:** Mermaid.js

## Быстрый старт

### Требования

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Установка

```bash
# Клонировать репозиторий
git clone https://github.com/Vladee101/System-Analyst.git
cd System-Analyst

# Установить зависимости
npm install

# Запустить в режиме разработки
npm run tauri dev

# Собрать для распространения
npm run tauri build
```

## Структура проекта

```
├── src/                    # React frontend
│   ├── views/              # Страницы (ScenarioWorkspace, ResultDashboard)
│   ├── store/              # Zustand state management
│   └── components/         # Переиспользуемые компоненты (Mermaid, Modal)
├── src-tauri/              # Rust backend
│   └── src/
│       ├── models.rs       # Модели данных (Scenario, Node, SessionState)
│       ├── commands.rs     # Tauri commands (load, submit, navigate)
│       └── lib.rs          # Entry point
├── scenarios/              # JSON-файлы сценариев
└── public/                 # Статические ресурсы
```

## Рекомендуемая IDE

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Лицензия

MIT

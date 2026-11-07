# Единая модель данных У Илем 4.1

## Принцип

Одна запись работы должна существовать в игре один раз. Доска задач, календарь, карточка объекта и командный чат показывают разные представления одной записи, а не создают копии.

## Каноническая запись `workItem`

```js
{
  id: "work_<stable-id>",
  kind: "task | object_stage | seasonal | maintenance | construction",
  title: "Короткое конкретное действие",
  description: "Ожидаемый результат и критерии готовности",
  status: "draft | review | planned | in_progress | waiting_resources | done | rejected | cancelled",
  objectId: "mainHouse | ... | null",
  assigneeId: "d | t | a | s | null",
  createdAt: "ISO-8601",
  updatedAt: "ISO-8601",
  source: { type: "player | ollama | calendar | object | system", text: "..." },
  priority: "urgent | normal | planned",
  schedule: { startDay: null, dueDay: null, season: null },
  effort: { estimateHours: 2, spentHours: 0, requiredSkill: 1 },
  materials: [{ itemId: "wood_board", name: "Доска", qty: 4, unit: "шт" }],
  purchases: [{ itemId: "wood_board", qty: 2, estimatedUnitPrice: 300, status: "needed" }],
  reservation: { status: "none | reserved | partial | blocked", lines: [] },
  progress: 0,
  actions: [],
  notes: "",
  history: []
}
```

## Инварианты

1. `id` уникален и не меняется после утверждения.
2. `objectId` либо `null`, либо ключ существующего объекта. Нельзя молча подменять выбранный объект другим.
3. Исполнитель выбирается по пригодности навыка, доступным часам и специализации. Если подходящего человека нет, задача остаётся без назначения и объясняет причину.
4. Задача не переходит в `planned`, если не прошла проверку обязательных полей.
5. `waiting_resources` означает, что задачу нельзя выполнить до пополнения склада или оформления закупки.
6. Резервирование не уменьшает физический остаток. Фактическое списание происходит только при выполнении.
7. Покупка увеличивает склад только после подтверждения операции покупки.
8. Календарь строится из `workItems` с заполненным `schedule`, не содержит собственных копий задач.
9. Объектный этап является `workItem` с `kind: "object_stage"` и конкретным `objectId`.
10. Ответ Ollama — недоверенный черновик. Он проходит валидацию, сопоставление объектов/материалов и проверку исполнителей до появления на доске.

## Миграция

- Источник: `stages`, `tasks`, `calendar.monthlyTasks`.
- Старые записи преобразуются в новый формат с детерминированными legacy-ID, чтобы повторная миграция не создавала дубликаты.
- Записи не удаляются из старых полей до подтверждения целостности миграции.
- Новая версия сохранения получает отдельный ключ и номер схемы. Старые ключи не перезаписываются.

jQuery Builder
==============

A micro-framework for creating jQuery-like libraries.

Задачи:

1. Когда делаем eval, лучше передавать jQuery.cb в строку не через точку, а через [] (с кавычками, как-то вроде такого: 'jQuery.cb["'+expr+'"]'), чтобы можно было использовать ключи без синтаксических ограничений. Пример: $("@active-at(2)"), внутри скобок любой валидный js-код

2. Сделать функции:
  
  1.1. jQuery.fn.random() -> возвращает рандомный элемент из выборки. Можно добавить аргумент x, количество элементов и возвращать выборку, содержашую x рандонмых элементов.

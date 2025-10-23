import { For, createEffect, Component } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { Task } from '../types/index';
import { Trans, useTransContext } from '@mbarzda/solid-i18next';

const TodoList: Component = () => {
  const [t] = useTransContext();

  const [state, setState] = createStore<{
    tasks: Task[];
    numberOfTasks: number;
  }>({
    tasks: [],
    numberOfTasks: 0,
  });

  const addTask = (text: any) => {
    setState('tasks', state.tasks.length, {
      id: state.tasks.length,
      text,
      completed: false,
    });
  };

  const toggleTask = (id: any) => {
    setState(
      'tasks',
      (task) => task.id === id,
      produce((task) => {
        task.completed = !task.completed;
      })
    );
  };

  createEffect(() => {
    setState('numberOfTasks', state.tasks.length);
  });

  let input: HTMLInputElement | undefined;

  return (
    <>
      <div class="l-container l-container--column l-container--full-height">
        <h1 class="text-3xl font-bold underline">{t('todo:title')}</h1>
        <span class="mb-8">{t('todo:subtitle', { numberOfTasks: state.numberOfTasks.toString() })}</span>
        {/* <Trans
          key="subtitle"
          ns="todo"
          values={{ numberOfTasks: state.numberOfTasks.toString() }}
        /> */}
        <input name="task-input" class="c-input" ref={input} />
        <button
          class="c-button mt-5"
          onClick={(e) => {
            if (!input || !input.value.trim()) return;
            addTask(input.value);
            input.value = '';
          }}
        >
          Add Task
        </button>
        <For each={state.tasks}>
          {(task) => {
            const { id, text } = task;
            return (
              <div class="l-task-item l-task-item--{id}">
                <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id)} />
                <span>{text}</span>
              </div>
            );
          }}
        </For>
      </div>
    </>
  );
};

export default TodoList;

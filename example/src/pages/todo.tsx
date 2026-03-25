import { For, createMemo, Component } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { Task } from '../types/index';
import { useL10n } from '../contexts/l10n.context';
import MainLayout from '../components/MainLayout';

const TodoPage: Component = () => {
  const { t } = useL10n();

  const [state, setState] = createStore<{
    tasks: Task[];
  }>({
    tasks: [],
  });

  const numberOfTasks = createMemo(() => state.tasks.length);

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

  let input: HTMLInputElement | undefined;

  return (
    <MainLayout>
      <div class="l-container l-container--column l-container--full-height">
        <h1 class="text-3xl font-bold underline">{t('todo', 'title')}</h1>
        <span class="mb-8">{t('todo', 'subtitle', { numberOfTasks: String(numberOfTasks()) })}</span>
        <input name="task-input" class="c-input" ref={input} />
        <button
          class="c-button mt-5"
          onClick={(e) => {
            if (!input || !input.value.trim()) return;
            addTask(input.value);
            input.value = '';
          }}
        >
          {t('todo', 'addButton')}
        </button>
        <For each={state.tasks}>
          {(task) => {
            return (
              <div class={`l-task-item l-task-item--${task.id}`}>
                <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id)} />
                <span>{task.text}</span>
              </div>
            );
          }}
        </For>
      </div>
    </MainLayout>
  );
};

export default TodoPage;

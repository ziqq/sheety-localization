import { Component, createSignal, onMount } from 'solid-js';
import { fetchSlots } from '../services/api';

const Booking: Component = () => {
  const [slots, setSlots] = createSignal<string[]>([]);

  onMount(async () => {
    const available = await fetchSlots(new Date().toISOString());
    setSlots(available);
  });

  return (
    <section>
      <h2>Select a time slot</h2>
      <ul>
        {slots().map(slot => <li>{slot}</li>)}
      </ul>
    </section>
  );
};

export default Booking;
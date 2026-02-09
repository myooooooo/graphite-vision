export class HistoryManager<T> {
  private past: T[] = [];
  private future: T[] = [];
  private maxSteps = 20;

  push(state: T) {
    this.past.push(structuredClone(state));
    if (this.past.length > this.maxSteps) this.past.shift();
    this.future = [];
  }

  undo(current: T): T | null {
    if (!this.past.length) return null;
    const prev = this.past.pop() as T;
    this.future.push(structuredClone(current));
    return prev;
  }

  redo(current: T): T | null {
    if (!this.future.length) return null;
    const next = this.future.pop() as T;
    this.past.push(structuredClone(current));
    return next;
  }

  clear() {
    this.past = [];
    this.future = [];
  }
}

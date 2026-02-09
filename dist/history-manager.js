export class HistoryManager {
    past = [];
    future = [];
    maxSteps;
    constructor(maxSteps = 20) { this.maxSteps = maxSteps; }
    push(state) {
        this.past.push(structuredClone(state));
        if (this.past.length > this.maxSteps)
            this.past.shift();
        this.future = [];
    }
    undo(current) {
        if (!this.past.length)
            return null;
        const prev = this.past.pop();
        this.future.push(structuredClone(current));
        return prev;
    }
    redo(current) {
        if (!this.future.length)
            return null;
        const next = this.future.pop();
        this.past.push(structuredClone(current));
        return next;
    }
    clear() { this.past = []; this.future = []; }
}

import {defaultIfEmpty, forkJoin} from "rxjs";

export const forkJoin$ = ((x: any) => forkJoin(x).pipe(defaultIfEmpty([]))) as typeof forkJoin


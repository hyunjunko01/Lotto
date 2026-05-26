export enum LottoState {
    OPEN = 0,
    FULL = 1,
    CALCULATING = 2,
    CLOSED = 3,
    REFUNDING = 4,
}

export function lottoStateToLabel(stateValue?: bigint | number) {
    if (stateValue === undefined) return '-';
    const state = typeof stateValue === 'bigint' ? Number(stateValue) : stateValue;
    if (state === LottoState.OPEN) return 'OPEN';
    if (state === LottoState.FULL) return 'FULL';
    if (state === LottoState.CALCULATING) return 'CALCULATING';
    if (state === LottoState.CLOSED) return 'CLOSED';
    if (state === LottoState.REFUNDING) return 'REFUNDING';
    return `UNKNOWN (${state})`;
}

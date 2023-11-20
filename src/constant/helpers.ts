export function Delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
}

export function GetActualTime(): number {
        return Math.floor(Date.now() / 1000)
}

export interface PreviousCall {
        Time: number
}
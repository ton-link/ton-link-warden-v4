import TonWeb from "tonweb";
const Cell = TonWeb.boc.Cell;

export async function GetCellForCall() {
        const cell = new Cell();
        cell.bits.writeUint(220, 32)
        cell.bits.writeUint(0, 64)
}
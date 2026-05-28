'use client';

type UserOpLike = {
    sender: string;
    nonce: string;
    initCode: string;
    callData: string;
    accountGasLimits: string;
    preVerificationGas: string;
    gasFees: string;
    paymasterAndData: string;
};

type Props = {
    signResultHash?: string;
    bundlerResultHash?: string;
    userOp: UserOpLike;
    panelClassName: string;
    textClassName: string;
};

export function UserOpDetailsPanel({
    signResultHash,
    bundlerResultHash,
    userOp,
    panelClassName,
    textClassName,
}: Props) {
    return (
        <div className={panelClassName}>
            <p className={textClassName}>
                <strong>sign userOpHash:</strong> {signResultHash || '-'}
            </p>
            <p className={textClassName}>
                <strong>send userOpHash:</strong> {bundlerResultHash || '-'}
            </p>
            <p className={textClassName}>
                <strong>sender:</strong> {userOp.sender || '-'}
            </p>
            <p className={textClassName}>
                <strong>nonce:</strong> {userOp.nonce}
            </p>
            <p className={textClassName}>
                <strong>initCode:</strong> {userOp.initCode}
            </p>
            <p className={textClassName}>
                <strong>callData:</strong> {userOp.callData}
            </p>
            <p className={textClassName}>
                <strong>accountGasLimits:</strong> {userOp.accountGasLimits}
            </p>
            <p className={textClassName}>
                <strong>preVerificationGas:</strong> {userOp.preVerificationGas}
            </p>
            <p className={textClassName}>
                <strong>gasFees:</strong> {userOp.gasFees}
            </p>
            <p className={textClassName}>
                <strong>paymasterAndData:</strong> {userOp.paymasterAndData}
            </p>
        </div>
    );
}

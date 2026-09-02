import Wallet from "../models/Wallet.js";

export const ensureDefaultWallet = async (userId) => {
  let wallet = await Wallet.findOne({ userId }).sort({ createdAt: 1 });

  if (!wallet) {
    wallet = await Wallet.create({
      userId,
      name: "Main Wallet",
      type: "cash",
      initialBalance: 0,
      balance: 0
    });
  }

  return wallet;
};

export const getWalletForTransaction = async (userId, walletId) => {
  if (walletId) {
    const wallet = await Wallet.findOne({ _id: walletId, userId });
    if (wallet) return wallet;
  }

  return ensureDefaultWallet(userId);
};

export const applyWalletImpact = async (walletId, type, amount) => {
  if (!walletId) return;

  const delta = type === "income" ? Number(amount) : -Number(amount);
  await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: delta } });
};

export const reverseWalletImpact = async (walletId, type, amount) => {
  if (!walletId) return;

  const delta = type === "income" ? -Number(amount) : Number(amount);
  await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: delta } });
};


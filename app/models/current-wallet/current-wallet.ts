import { Instance, types } from "mobx-state-tree"
import { StoredWallet } from "../../utils/stored-wallet"

const WalletAsset = types.model({
  name: types.string,
  chain: types.string,
  publicKey: types.string,
  privateKey: types.string,
  address: types.string,
  symbol: types.string,
  type: types.string,
  cid: types.optional(types.string, ""),
  balance: types.optional(types.number, 0),
  value: types.optional(types.number, 0),
  rate: types.optional(types.number, 0),
  version: types.optional(types.number, 0),
  image: types.optional(types.string, ""),
  decimals: types.number,
})
export type IWalletAsset = Instance<typeof WalletAsset>

/**
 * Model description here for TypeScript hints.
 */
export const CurrentWalletModel = types
  .model("CurrentWallet")
  .props({
    wallet: types.maybe(types.string),
    assets: types.array(WalletAsset),
  })
  .views((self) => ({
    getWallet: () => {
      if (self.wallet) {
        return StoredWallet.loadFromJson(JSON.parse(self.wallet))
      }
      return null
    },
    getAssets: async () => {
      console.log("assets ", self.assets, self.wallet)
      return self.assets
    },
  })) // eslint-disable-line @typescript-eslint/no-unused-vars
  .actions((self) => ({
    setAssets(assets) {
      self.assets = assets
    },
    open: (wallet: StoredWallet) => {
      console.log("open wallet ", wallet, wallet.toJson())
      self.wallet = JSON.stringify(wallet.toJson())
      self.assets = wallet.toJson().assets as any
    },
    close: () => {
      self.wallet = null
    },
    setBalance: (asset, balance: number) => {
      const storedAsset = self.assets.find((a) => a.symbol === asset.symbol)

      if (storedAsset) {
        storedAsset.balance = balance
      }
    },
  })) // eslint-disable-line @typescript-eslint/no-unused-vars

export const currentWalletStore = CurrentWalletModel.create({
  wallet: undefined, // the type here is different from the type in the actual model
})

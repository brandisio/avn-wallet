import { NetworkType } from "config/networks"
import { flow, Instance, SnapshotOut, types } from "mobx-state-tree"
import { remove } from "utils/storage"
import { StoredWallet } from "../../utils/stored-wallet"
import { getBalance } from "services/api"
import { walletConnectService } from "services/walletconnect"

const WalletAsset = types.model({
  name: types.string,
  chain: types.string,
  publicKey: types.string,
  privateKey: types.string,
  address: types.string,
  symbol: types.string,
  type: types.string,
  cid: types.optional(types.string, ""),
  contract: types.optional(types.string, ""),
  balance: types.optional(types.number, 0),
  value: types.optional(types.number, 0),
  rate: types.optional(types.number, 0),
  version: types.optional(types.number, 0),
  image: types.optional(types.string, ""),
  decimals: types.optional(types.number, 8),
})
export type IWalletAsset = Instance<typeof WalletAsset>

/**
 * Model description here for TypeScript hints.
 */
export const CurrentWalletModel = types
  .model("CurrentWallet")
  .props({
    wallet: types.maybe(types.string),
    name: types.maybe(types.string),
    assets: types.array(WalletAsset),
    loadingBalance: types.boolean,
  })
  .views((self) => ({
    getWallet: () => {
      if (self.wallet) {
        return StoredWallet.loadFromJson(JSON.parse(self.wallet))
      }
      return null
    },
    getAssets: async () => {
      return self.assets
    },
    getAssetById: (cid: string, chain?: string) => {
      return self.assets.find((a) => (!chain && a.cid === cid) || (chain && a.cid === cid && a.chain === chain))
    },
    getAssetByChain: (chain: string) => {
      return self.assets.find((a) => a.chain === chain)
    },
    getWalletAddressByChain: (chain: string) => {
      const asset = self.assets.find((a) => a.chain === chain)
      if (asset) {
        return asset.address
      }
      console.warn("NO asset found")
      return ""
    },
  })) // eslint-disable-line @typescript-eslint/no-unused-vars
  .actions((self) => ({
    setAssets(assets) {
      self.assets = assets

      let wallet = JSON.parse(self.wallet)
      wallet.assets = assets
      self.wallet = JSON.stringify(wallet)
    },
    hasAsset: (network: NetworkType): boolean => {
      return (
        self.assets.filter((asset) => {
          return asset.name === network.name && asset.chain === asset.chain
        }).length > 0
      )
    },

    resetBalance: () => {
      let wallet = JSON.parse(self.wallet)
      self.assets = self.assets.map((asset) => ({ ...asset, balance: 0 })) as any
      wallet.assets = self.assets
      self.wallet = JSON.stringify(wallet)
    },

    open: (wallet: StoredWallet) => {
      self.wallet = JSON.stringify(wallet.toJson())
      self.assets = wallet.toJson().assets as any
      self.name = wallet.toJson().walletName
    },
    close: () => {
      self.wallet = undefined
      self.assets = [] as any
      self.name = ""
    },
    setBalance: (asset, balance: number) => {
      const storedAsset = self.assets.find(
        (a) => a.symbol === asset.symbol && a.chain === asset.chain,
      )
      storedAsset.balance = balance
    },
    stopLoading: () => {
      self.loadingBalance = false
    },
    refreshBalances: flow(function* refreshBalances() {
      self.loadingBalance = true

      for (let asset of self.assets) {
        try {
          const balance = yield getBalance(asset)
          asset.balance = balance
        } catch (error) {
          console.error({ error })
        }
      }
      self.loadingBalance = false
    }),

    removeWallet: async () => {
      try {
        const deleted = await remove(self.name)
      } catch (error) {
        console.log("Error removing wallet", error)
      }
    },
  })) // eslint-disable-line @typescript-eslint/no-unused-vars

export const currentWalletStore = CurrentWalletModel.create({
  wallet: undefined, // the type here is different from the type in the actual model
  loadingBalance: false,
})

type CurrentWalletType = Instance<typeof CurrentWalletModel>
export interface CurrentWallet extends CurrentWalletType {}
type CurrentWalletSnapshotType = SnapshotOut<typeof CurrentWalletModel>
export interface CurrentWalletSnapshot extends CurrentWalletSnapshotType {}
export const createCurrentWalletDefaultModel = () =>
  types.optional(CurrentWalletModel, {
    wallet: undefined,
    loadingBalance: false,
  })

import { LitElement, html } from 'lit'
import { state } from 'lit/decorators.js'

import {
  ChainController,
  ConnectionController,
  EventsController,
  ModalController,
  OptionsController,
  RouterController,
  SnackController,
  getPreferredAccountType
} from '@reown/appkit-controllers'
import { customElement } from '@reown/appkit-ui'
import { W3mFrameRpcConstants } from '@reown/appkit-wallet/utils'

import { SIWEController } from '../../../core/controller/SIWEController.js'

@customElement('w3m-connecting-siwe-view')
export class W3mConnectingSiweView extends LitElement {
  // -- Members ------------------------------------------- //
  private readonly dappName = OptionsController.state.metadata?.name

  @state() private isSigning = false

  @state() private isCancelling = false

  // -- Render -------------------------------------------- //
  public override render() {
    return html`
      <wui-flex justifyContent="center" .padding=${['2xl', '0', 'xxl', '0'] as const}>
        <w3m-connecting-siwe></w3m-connecting-siwe>
      </wui-flex>
      <wui-flex
        .padding=${['0', '4xl', 'l', '4xl'] as const}
        gap="s"
        justifyContent="space-between"
      >
        <wui-text variant="paragraph-500" align="center" color="fg-100"
          >${this.dappName ?? 'Dapp'} needs to connect to your wallet</wui-text
        >
      </wui-flex>
      <wui-flex
        .padding=${['0', '3xl', 'l', '3xl'] as const}
        gap="s"
        justifyContent="space-between"
      >
        <wui-text variant="small-400" align="center" color="fg-200"
          >Sign this message to prove you own this wallet and proceed. Canceling will disconnect
          you.</wui-text
        >
      </wui-flex>
      <wui-flex .padding=${['l', 'xl', 'xl', 'xl'] as const} gap="s" justifyContent="space-between">
        <wui-button
          size="lg"
          borderRadius="xs"
          fullWidth
          variant="neutral"
          ?loading=${this.isCancelling}
          @click=${this.onCancel.bind(this)}
          data-testid="w3m-connecting-siwe-cancel"
        >
          Cancel
        </wui-button>
        <wui-button
          size="lg"
          borderRadius="xs"
          fullWidth
          variant="main"
          @click=${this.onSign.bind(this)}
          ?loading=${this.isSigning}
          data-testid="w3m-connecting-siwe-sign"
        >
          ${this.isSigning ? 'Signing...' : 'Sign'}
        </wui-button>
      </wui-flex>
    `
  }

  // -- Private ------------------------------------------- //
  private async onSign() {
    this.isSigning = true
    EventsController.sendEvent({
      event: 'CLICK_SIGN_SIWX_MESSAGE',
      type: 'track',
      properties: {
        network: ChainController.state.activeCaipNetwork?.caipNetworkId || '',
        isSmartAccount:
          getPreferredAccountType(ChainController.state.activeChain) ===
          W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
      }
    })
    try {
      SIWEController.setStatus('loading')
      const session = await SIWEController.signIn()
      SIWEController.setStatus('success')
      EventsController.sendEvent({
        event: 'SIWX_AUTH_SUCCESS',
        type: 'track',
        properties: {
          network: ChainController.state.activeCaipNetwork?.caipNetworkId || '',
          isSmartAccount:
            getPreferredAccountType(ChainController.state.activeChain) ===
            W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
        }
      })

      return session
    } catch (error) {
      const preferredAccountType = getPreferredAccountType(ChainController.state.activeChain)
      const isSmartAccount =
        preferredAccountType === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT

      SnackController.showError('Error signing message')
      SIWEController.setStatus('error')

      // eslint-disable-next-line no-console
      console.error('Failed to sign SIWE message', error)

      return EventsController.sendEvent({
        event: 'SIWX_AUTH_ERROR',
        type: 'track',
        properties: {
          network: ChainController.state.activeCaipNetwork?.caipNetworkId || '',
          isSmartAccount
        }
      })
    } finally {
      this.isSigning = false
    }
  }

  private async onCancel() {
    this.isCancelling = true
    const caipAddress = ChainController.state.activeCaipAddress
    if (caipAddress) {
      await ConnectionController.disconnect()
      ModalController.close()
    } else {
      RouterController.push('Connect')
    }
    this.isCancelling = false
    EventsController.sendEvent({
      event: 'CLICK_CANCEL_SIWX',
      type: 'track',
      properties: {
        network: ChainController.state.activeCaipNetwork?.caipNetworkId || '',
        isSmartAccount:
          getPreferredAccountType(ChainController.state.activeChain) ===
          W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
      }
    })
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'w3m-connecting-siwe-view': W3mConnectingSiweView
  }
}

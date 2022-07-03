import React, { useState, useEffect, useRef } from 'react'
import {
  FormattedMessage,
  MessageDescriptor,
  useIntl,
  defineMessages,
} from 'react-intl'
import { Button, Tooltip } from 'vtex.styleguide'
import { Utils } from 'vtex.checkout-resources'
import { useCssHandles } from 'vtex.css-handles'
import { useRuntime } from 'vtex.render-runtime'
import { usePixel } from 'vtex.pixel-manager'
import { useProductDispatch } from 'vtex.product-context'
import { usePWA } from 'vtex.store-resources/PWAContext'
import { useOrderItems } from 'vtex.order-items/OrderItems'

import { CartItem } from './modules/catalogItemToCart'
import useMarketingSessionParams from './hooks/useMarketingSessionParams'
import AddToCartModal from './components/AddToCartModal'


// Yeezy & limited
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { yeezyClusterId, limitedClusterId } from './config'
import { getClustersFromProduct } from './services/getClustersFromProduct'

export interface ProductLink {
  linkText?: string
  productId?: string
}
export interface ProductCluster {
  id: string,
  name: string
}
interface Props {
  isOneClickBuy: boolean
  available: boolean
  disabled: boolean
  multipleAvailableSKUs: boolean
  customToastUrl?: string
  customOneClickBuyLink?: string
  skuItems: CartItem[]
  showToast: Function
  allSkuVariationsSelected: boolean
  text?: string
  unavailableText?: string
  productLink: ProductLink
  productClusters?: ProductCluster[]
  onClickBehavior: 'add-to-cart' | 'go-to-product-page' | 'ensure-sku-selection'
  customPixelEventId?: string
  addToCartFeedback?: 'customEvent' | 'toast' | 'modal'
  onClickEventPropagation: 'disabled' | 'enabled'
  isLoading?: boolean
  timeToCloseTheModal?: number
}

// We apply a fake loading to accidental consecutive clicks on the button
const FAKE_LOADING_DURATION = 500

function getFakeLoadingDuration(isOneClickBuy: boolean) {
  return isOneClickBuy ? FAKE_LOADING_DURATION * 10 : FAKE_LOADING_DURATION
}

const CSS_HANDLES = [
  'buttonText',
  'buttonDataContainer',
  'tooltipLabelText',
] as const

const messages = defineMessages({
  success: { id: 'store/add-to-cart.success' },
  duplicate: { id: 'store/add-to-cart.duplicate' },
  error: { id: 'store/add-to-cart.failure' },
  seeCart: { id: 'store/add-to-cart.see-cart' },
  skuVariations: {
    id: 'store/add-to-cart.select-sku-variations',
  },
  schemaTitle: { id: 'admin/editor.add-to-cart.title' },
  schemaTextTitle: { id: 'admin/editor.add-to-cart.text.title' },
  schemaTextDescription: { id: 'admin/editor.add-to-cart.text.description' },
  schemaUnavailableTextTitle: {
    id: 'admin/editor.add-to-cart.text-unavailable.title',
  },
  schemaUnavailableTextDescription: {
    id: 'admin/editor.add-to-cart.text-unavailable.description',
  },
})

const options = {
  allowedOutdatedData: ['paymentData'],
}

const mapSkuItemForPixelEvent = (skuItem: CartItem) => {
  // Changes this `/Apparel & Accessories/Clothing/Tops/`
  // to this `Apparel & Accessories/Clothing/Tops`
  const category = skuItem.category ? skuItem.category.slice(1, -1) : ''

  return {
    skuId: skuItem.id,
    ean: skuItem.ean,
    variant: skuItem.variant,
    price: skuItem.price,
    sellingPrice: skuItem.sellingPrice,
    priceIsInt: true,
    name: skuItem.name,
    quantity: skuItem.quantity,
    productId: skuItem.productId,
    productRefId: skuItem.productRefId,
    brand: skuItem.brand,
    category,
    detailUrl: skuItem.detailUrl,
    imageUrl: skuItem.imageUrl,
    referenceId: skuItem?.referenceId?.[0]?.Value,
    seller: skuItem.seller,
    sellerName: skuItem.sellerName,
  }
}

function AddToCartButton(props: Props) {
  const {
    text,
    isOneClickBuy,
    available,
    disabled,
    skuItems,
    showToast,
    customToastUrl,
    unavailableText,
    customOneClickBuyLink,
    allSkuVariationsSelected = true,
    productLink,
    productClusters,
    onClickBehavior,
    multipleAvailableSKUs,
    customPixelEventId,
    addToCartFeedback,
    timeToCloseTheModal,
    onClickEventPropagation = 'disabled',
    isLoading
  } = props

  const intl = useIntl()
  const handles = useCssHandles(CSS_HANDLES)
  const { addItems } = useOrderItems()
  const productContextDispatch = useProductDispatch()
  const { rootPath = '', navigate } = useRuntime()
  const { url: checkoutURL, major } = Utils.useCheckoutURL()
  const { push } = usePixel()
  const { settings = {}, showInstallPrompt = undefined } = usePWA() || {}
  const { promptOnCustomEvent } = settings
  const { utmParams, utmiParams } = useMarketingSessionParams()
  const [isFakeLoading, setFakeLoading] = useState(false)
  const translateMessage = (message: MessageDescriptor) =>
    intl.formatMessage(message)

  // Modal
  const [showModal, setShowModal] = useState(false)

  // Yeezy & limited
  const orderForm = useOrderForm()
  const items = orderForm?.orderForm?.items || []

  const [dontAllowYeezy, setDontAllowYeezy] = useState(false)
  const [yeezyInCart, setIsYeezyInCart] = useState(false)
  const [currentlyInLimitedProduct, setIsCurrentlyInLimitedProduct] = useState(false)

  // collect toast and fake loading delay timers
  const timers = useRef<Record<string, number | undefined>>({})

  // prevent timers from doing something if the component was unmounted
  useEffect(function onUnmount() {
    return () => {
      // We disable the eslint rule because we just want to clear the current existing timers
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(timers.current).forEach(clearTimeout)
    }
  }, [])

  useEffect(() => {
    const currentTimers = timers.current

    if (isFakeLoading) {
      currentTimers.loading = window.setTimeout(
        () => setFakeLoading(false),
        getFakeLoadingDuration(isOneClickBuy)
      )
    }
  }, [isFakeLoading, isOneClickBuy])

  const resolveToastMessage = (success: boolean) => {
    if (!success) return translateMessage(messages.error)

    return translateMessage(messages.success)
  }

  const toastMessage = ({ success }: { success: boolean }) => {
    const message = resolveToastMessage(success)

    const action = success
      ? { label: translateMessage(messages.seeCart), href: customToastUrl }
      : undefined

    showToast({ message, action })
  }

  const handleAddToCart = async () => {
    setFakeLoading(true)

    const productLinkIsValid = Boolean(
      productLink.linkText && productLink.productId
    )
    const shouldNavigateToProductPage =
      onClickBehavior === 'go-to-product-page' ||
      (onClickBehavior === 'ensure-sku-selection' && multipleAvailableSKUs)

    if (productLinkIsValid && shouldNavigateToProductPage) {
      navigate({
        page: 'store.product',
        params: {
          slug: productLink.linkText,
          id: productLink.productId,
        },
      })
      return
    }

    const addItemsPromise = addItems(skuItems, {
      marketingData: { ...utmParams, ...utmiParams },
      ...options,
    })

    const pixelEventItems = skuItems.map(mapSkuItemForPixelEvent)
    const pixelEvent =
      customPixelEventId && addToCartFeedback === 'customEvent'
        ? {
            id: customPixelEventId,
            event: 'addToCart',
            items: pixelEventItems,
          }
        : {
            event: 'addToCart',
            items: pixelEventItems,
          }

    // @ts-expect-error the event is not typed in pixel-manager
    push(pixelEvent)

    if (isOneClickBuy) {
      await addItemsPromise

      if (
        major > 0 &&
        (!customOneClickBuyLink || customOneClickBuyLink === checkoutURL)
      ) {
        navigate({ to: checkoutURL })
      } else {
        window.location.assign(
          `${rootPath}${customOneClickBuyLink ?? checkoutURL}`
        )
      }
    }

    addToCartFeedback === 'toast' &&
    (timers.current.toast = window.setTimeout(() => {
      toastMessage({ success: true })
    }, FAKE_LOADING_DURATION))

    if (addToCartFeedback === 'modal') {
      setShowModal(true)


      if(timeToCloseTheModal){
        setTimeout(() => {
          setShowModal(false)
        }, timeToCloseTheModal)
      }
    }

    /* PWA */
    if (promptOnCustomEvent === 'addToCart' && showInstallPrompt) {
      showInstallPrompt()
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    if (productContextDispatch) {
      productContextDispatch({
        type: 'SET_BUY_BUTTON_CLICKED',
        args: { clicked: true },
      })
    }

    if (onClickEventPropagation === 'disabled') {
      e.preventDefault()
      e.stopPropagation()
    }

    if (allSkuVariationsSelected) {
      if(items.length){
         // If there are any product in the cart and is trying to add a Yeezy
         if (productClusters?.some((clusters:any) => clusters.id === yeezyClusterId)){
          setDontAllowYeezy(true)
         }
         else{
           // If there is a Yeezy in the cart
           let thereIsAYeezy=false
           const checkThereIsAYeezy = Promise.all(
             items.map(async(item:any) => {
               const clusters = await getClustersFromProduct(item.productId)
               if (Object.keys(clusters).includes(yeezyClusterId)){
                 thereIsAYeezy=true
               }
             })
           )
           checkThereIsAYeezy.then(()=>{
             if(thereIsAYeezy){
               setIsYeezyInCart(true)
             }
             // If the product is a limited product
             else{
               let productIsInCart = items.some((item:any) => item.productId.toString() === productLink.productId)
               if (productIsInCart){
                 const clusters = Promise.resolve(getClustersFromProduct(productLink.productId || ''));
                 let allowHandleAddToCart = true;

                 clusters.then((clusters:any) => {
                   if (Object.keys(clusters).includes(limitedClusterId)){
                     setIsCurrentlyInLimitedProduct(true)
                     allowHandleAddToCart=false
                   }
                   if(allowHandleAddToCart){
                     handleAddToCart()
                   }
                 })
               }
               else{
                 handleAddToCart()
               }
             }
           })
         }
      }
      else{
        handleAddToCart()
      }
    }
  }

  /*
   * If text is an empty string it should render the default message
   */
  const availableButtonContent = (
    <div className={`${handles.buttonDataContainer} flex justify-center`}>
      {text ? (
        <span className={handles.buttonText}>{text}</span>
      ) : (
        <FormattedMessage id="store/add-to-cart.add-to-cart">
          {message => <span className={handles.buttonText}>{message}</span>}
        </FormattedMessage>
      )}
    </div>
  )

  const unavailableButtonContent = unavailableText ? (
    <span className={handles.buttonText}>{unavailableText}</span>
  ) : (
    <FormattedMessage id="store/add-to-cart.label-unavailable">
      {message => <span className={handles.buttonText}>{message}</span>}
    </FormattedMessage>
  )

  const tooltipLabel = (
    <span className={handles.tooltipLabelText}>
      {intl.formatMessage(messages.skuVariations)}
    </span>
  )

  const ButtonWithLabel = (
    dontAllowYeezy ? <div>No puedes agregar un Yeezy si tienes otros productos en tu carrito</div> :
    yeezyInCart ? <div>No puedes agregar este producto. Tienes un Yeezy en tu carrito</div> :
    currentlyInLimitedProduct ? <div>No puedes agregar más unidades de este producto</div> :
    <Button
      block
      isLoading={isFakeLoading || isLoading}
      disabled={disabled || !available}
      onClick={handleClick}
    >
      {available ? availableButtonContent : unavailableButtonContent}
    </Button>
  )

  return allSkuVariationsSelected ? (
    <div>
      {ButtonWithLabel}
      {showModal ? (
        <AddToCartModal
          showModal={showModal}
          setShowModal={setShowModal}
          skuItems={skuItems}
          productClusters={productClusters}
        />
      ) : null}
    </div>
  ) : (
    <Tooltip trigger="click" label={tooltipLabel}>
      {ButtonWithLabel}
    </Tooltip>
  )
}

export default AddToCartButton

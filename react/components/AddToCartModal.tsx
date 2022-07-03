import React, { useState, useEffect } from 'react'
import { FormattedMessage } from 'react-intl'

import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { useCheckoutURL } from 'vtex.checkout-resources/Utils'
import { useCssHandles } from 'vtex.css-handles'
import { FormattedCurrency } from 'vtex.format-currency'
import { Modal, Button } from 'vtex.styleguide'

import '../styles/styles.css'
import { CartItem } from '../modules/catalogItemToCart'
import { ProductCluster } from '../AddToCartButton'

// Giftcards
import { giftcardsClusterId } from '../config'

const CSS_HANDLES = [
  'Modal',
  'ModalProductInfo',
  'ModalHeader',
  'ModalHeaderTitle',
  'ModalCartText',
  'ModalProductImage',
  'ModalProductName',
  'ModalProductDetails',
  'ModalGiftcardMessage',
  'ModalFooter',
  'ModalKeepBuyingBtn',
  'ModalGoToCheckoutBtn',
  'ModalTotal'
]

interface Props {
  skuItems: CartItem[]
  showModal: boolean
  setShowModal: Function
  productClusters?: ProductCluster[]
}

function AddToCartModal(props: Props) {
  const { skuItems, showModal, setShowModal, productClusters} = props

  const [ isAGiftcard, setIsAGiftcard ] = useState(false)
  const { orderForm } = useOrderForm()
  const { url } = useCheckoutURL()
  const handles = useCssHandles(CSS_HANDLES)

  const closeModal = (e:any) => {
    e.stopPropagation()
    setShowModal(false)
  }

  useEffect(()=>{
    if (productClusters?.some((clusters:any) => clusters.id === giftcardsClusterId)) setIsAGiftcard(true)
  },[])

  return (
    <>
      {skuItems ?
        <Modal
            centered
            isOpen={showModal}
            onClose={closeModal}
            responsiveFullScreen={true}
            className={'modalContainer'}
          >
            <div className={handles.Modal}>
              <div className={`${handles.ModalHeader}`}>
                <FormattedMessage id="store/add-to-cart.add-to-cart">
                  {message => (
                    <h2 className={`${handles.ModalHeaderTitle} tc mt0`}>
                      {message}
                    </h2>
                  )}
                </FormattedMessage>
              </div>
              <div className={handles.ModalBody}>
                <div className={`${handles.ModalProductInfo} flex`}>
                  <div className={`${handles.ModalProductImageContainer} w-100 w-40-ns`}>
                    <img
                      src={skuItems[0].imageUrl}
                      className={`${handles.ModalProductImage}`}
                      alt={`${skuItems[0].name}`}
                    />
                  </div>
                  <div className={`${handles.ModalCartText} w-100 w-60-ns flex flex-column items-center justify-center ph5 tc`}>
                    <h3 className={`${handles.ModalProductName} f3`}>
                      {skuItems[0].name}
                    </h3>
                    <div className={handles.ModalProductDetails}>
                      <FormattedCurrency value={skuItems[0].sellingPrice / 100} />
                      <div>{skuItems[0].skuName}</div>
                      <FormattedMessage id="store/add-to-cart.quantity">
                        {message => (
                          <div>
                            {message}: {skuItems[0].quantity}
                          </div>
                        )}
                      </FormattedMessage>
                      {
                        isAGiftcard ? <div className={`${handles.ModalGiftcardMessage} mt5`}>Podrá ingresar la información del beneficiario durante el checkout</div> : null
                      }
                     </div>
                  </div>
                </div>
              </div>
              <div className={`${handles.ModalFooter} flex tc mt5 pt5 bt b--muted-4`}>
                <div className='w-50'>
                  <FormattedMessage id="store/add-to-cart.items">
                    {message => (
                      <p className="w-100 b">
                        {message}: {orderForm.items.length}
                      </p>
                    )}
                  </FormattedMessage>
                  <FormattedMessage id="store/add-to-cart.continue-shopping">
                  {message => (
                    <div className={handles.ModalKeepBuyingBtn}>
                      <Button
                        href="/"
                        variation="secondary"
                      >
                        {message}
                      </Button>
                    </div>
                  )}
                </FormattedMessage>
                </div>
                <div className='w-50'>
                  <p className={`${handles.ModalTotal} b`}>
                    <FormattedMessage id="store/add-to-cart.total">
                      {message => <span>{message}: <FormattedCurrency value={orderForm.value / 100} /></span>}
                    </FormattedMessage>
                  </p>
                  <FormattedMessage id="store/add-to-cart.go-to-checkout">
                    {message => (
                      <div className={handles.ModalGoToCheckoutBtn}>
                          <Button
                          href={url}
                          variation="primary"
                        >
                          {message}
                        </Button>
                      </div>
                    )}
                  </FormattedMessage>
                </div>
              </div>
            </div>
        </Modal>
        :
        null
      }
    </>
  )
}

export default AddToCartModal

export const getClustersFromProduct = async(productId:string) => {
    const response = await fetch(`/api/catalog_system/pub/products/search?fq=productId:${productId}`)
    const data = await response.json()
    const clusters = await data[0].productClusters

    return clusters
}

// Tailwind CSSのCDNを追加する関数
function addTailwindStylesheet() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css";
    document.head.appendChild(link);
}

// デフォルトのダミー画像URL
const DEFAULT_IMAGE_URL = 'https://via.placeholder.com/64';

// 商品リストを表示する関数
function displayProducts(price, isCheckout) {
    addTailwindStylesheet(); // Tailwind CSSのスタイルシートを追加

    let alternativeProductsDiv = document.getElementById('alternative-products');
    if (!alternativeProductsDiv) {
        alternativeProductsDiv = document.createElement('div');
        alternativeProductsDiv.id = 'alternative-products';
        alternativeProductsDiv.classList.add('fixed', 'bottom-4', 'right-4', 'z-50', 'w-80', 'bg-white', 'rounded-lg', 'shadow-lg');
        document.body.appendChild(alternativeProductsDiv);

        // ヘッダーと最小化ボタンを作成
        const headerDiv = document.createElement('div');
        headerDiv.classList.add('flex', 'justify-between', 'items-center', 'p-4', 'border-b', 'border-gray-200');

        const headerText = document.createElement('h3');
        headerText.classList.add('text-lg', 'font-bold');
        headerText.textContent = 'Recommended Alternatives';

        const minimizeButton = document.createElement('button');
        minimizeButton.textContent = '−';
        minimizeButton.classList.add('px-2', 'py-1', 'bg-gray-200', 'rounded', 'text-sm', 'hover:bg-gray-300', 'focus:outline-none');

        // 最小化ボタンのイベントリスナーを追加
        minimizeButton.addEventListener('click', () => {
            alternativeProductsDiv.style.display = 'none';
            const restoreButton = document.createElement('button');
            restoreButton.id = 'restore-alternative-products';
            restoreButton.textContent = '+';
            restoreButton.classList.add('fixed', 'bottom-4', 'right-4', 'z-50', 'px-4', 'py-2', 'bg-blue-500', 'text-white', 'rounded-full', 'text-xl', 'shadow-lg', 'hover:bg-blue-600', 'focus:outline-none');
            restoreButton.addEventListener('click', () => {
                alternativeProductsDiv.style.display = 'block';
                restoreButton.remove();
            });
            document.body.appendChild(restoreButton);
        });

        headerDiv.appendChild(headerText);
        headerDiv.appendChild(minimizeButton);
        alternativeProductsDiv.appendChild(headerDiv);
    }

    // 既存の内容をクリア（ヘッダーを残す）
    while (alternativeProductsDiv.childNodes.length > 1) {
        alternativeProductsDiv.removeChild(alternativeProductsDiv.lastChild);
    }

    // チェックアウトの金額または検知されていない旨を表示
    const infoDiv = document.createElement('div');
    infoDiv.classList.add('p-4', 'bg-gray-100', 'text-sm');
    if (isCheckout) {
        const formattedPrice = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(price);
        infoDiv.textContent = `Checkout amount: ${formattedPrice}`;
    } else {
        infoDiv.textContent = 'Not on checkout page';
    }
    alternativeProductsDiv.appendChild(infoDiv);

    // 商品リストを表示するための新しいdiv要素を作成
    const productsListDiv = document.createElement('div');
    productsListDiv.classList.add('overflow-y-auto', 'max-h-96');
    alternativeProductsDiv.appendChild(productsListDiv);

    chrome.storage.sync.get({ products: [] }, (data) => {
        const products = data.products;

        // 金額が安い順に商品をソート
        products.sort((a, b) => a.price - b.price);

        // ソートされた商品を表示
        products.forEach(product => {
            const productDiv = document.createElement('div');
            productDiv.classList.add('flex', 'items-center', 'p-4', 'border-b', 'border-gray-200');
            
            const formattedPrice = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(product.price);
            const quantity = (price / product.price).toFixed(1);
            const imageUrl = product.image || DEFAULT_IMAGE_URL;

            productDiv.innerHTML = `
                <div class="flex-shrink-0 w-16 h-16 mr-4">
                    <img src="${imageUrl}" alt="${product.name}" class="w-full h-full object-cover rounded">
                </div>
                <div class="flex-grow">
                    <a href="${product.link}" target="_blank" class="text-blue-600 hover:underline font-medium">${product.name} - ${formattedPrice}</a>
                    <p class="text-sm text-gray-600">(${quantity}個)</p>
                </div>`;
            
            productsListDiv.appendChild(productDiv);
        });
    });
}

// オブザーバーの設定
const observer = new MutationObserver((mutations, obs) => {
    const placeOrderButton = document.querySelector('button[data-test="place-order-btn"]');
    if (placeOrderButton) {
        // 監視を停止
        obs.disconnect();

        console.log("Found place order button");

        // 3秒のディレイを追加
        setTimeout(() => {
            console.log("3秒経過");

            // ここでスクリプトを実行
            if (window.location.href.includes('checkout')) {
                console.log("Checkout page detected");

                // 決済ページから金額を取得する
                const priceElement = document.querySelector('div[data-test="fare-breakdown"] > div:nth-of-type(2)');
                const priceText = priceElement ? priceElement.textContent : '';
                const price = parseFloat(priceText.replace(/[^0-9.-]+/g, '')); // 金額を数値に変換

                console.log("金額: " + price);
                console.log(priceElement);

                displayProducts(price, true); // 商品リスト表示
            }
        }, 3000); // 3秒のディレイ
    }
});

// 監視を開始する関数
function startObserver() {
    observer.observe(document, {
        childList: true,
        subtree: true
    });
}

// 初回監視開始
startObserver();

// URL の変化を監視して、チェックアウトページに戻ったときに監視を再開
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        if (url.includes('checkout')) {
            console.log('URL changed to checkout, restarting observer');
            startObserver();
        }
    }
}).observe(document, { subtree: true, childList: true });

// 初回実行
chrome.storage.sync.get({ products: [] }, (data) => {
    const products = data.products;
    const defaultPrice = 0; // 任意のデフォルト金額で最初に表示
    displayProducts(defaultPrice, false);
});

// メッセージリスナーの追加
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'updateProducts') {
        // 更新されたプロダクトを表示する
        const priceElement = document.querySelector('div[data-test="fare-breakdown"] > div:nth-of-type(2)');
        const priceText = priceElement ? priceElement.textContent : '';
        const price = parseFloat(priceText.replace(/[^0-9.-]+/g, '')); // 金額を数値に変換

        displayProducts(price, window.location.href.includes('checkout'));
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});

document.getElementById('add-product-button').addEventListener('click', () => {
    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const link = document.getElementById('product-link').value;
    const image = document.getElementById('product-image').value;

    if (name && !isNaN(price) && link) {
        chrome.storage.sync.get({ products: [] }, (data) => {
            const products = data.products;
            const id = new Date().getTime(); // ユニークなIDを生成
            products.push({ id, name, price, link, image });
            chrome.storage.sync.set({ products }, () => {
                document.getElementById('status').textContent = 'Product added successfully!';
                setTimeout(() => {
                    document.getElementById('status').textContent = '';
                }, 1000);
                document.getElementById('product-name').value = '';
                document.getElementById('product-price').value = '';
                document.getElementById('product-link').value = '';
                document.getElementById('product-image').value = '';
                loadProducts();
                updateContentScript(); // Content script に通知
            });
        });
    } else {
        document.getElementById('status').textContent = 'Please fill in all fields.';
    }
});

function loadProducts() {
    chrome.storage.sync.get({ products: [] }, (data) => {
        const productList = document.getElementById('product-list');
        productList.innerHTML = '';

        // 金額の小さい順にソート
        const sortedProducts = data.products.sort((a, b) => a.price - b.price);

        sortedProducts.forEach((product) => {
            const productDiv = document.createElement('div');
            productDiv.className = 'product-item';
            productDiv.innerHTML = `
                <input type="text" class="edit-name" value="${product.name}" />
                <input type="number" class="edit-price" value="${product.price}" />
                <input type="text" class="edit-link" value="${product.link}" />
                <input type="text" class="edit-image" value="${product.image || ''}" placeholder="Product Image Link (optional)" />
                <button class="save-button" data-id="${product.id}">Save</button>
                <button class="delete-button" data-id="${product.id}">Delete</button>
            `;
            productList.appendChild(productDiv);
        });

        document.querySelectorAll('.save-button').forEach(button => {
            button.addEventListener('click', () => {
                const id = parseInt(button.getAttribute('data-id'), 10);
                const name = button.parentElement.querySelector('.edit-name').value;
                const price = parseFloat(button.parentElement.querySelector('.edit-price').value);
                const link = button.parentElement.querySelector('.edit-link').value;
                const image = button.parentElement.querySelector('.edit-image').value;

                if (name && !isNaN(price) && link) {
                    chrome.storage.sync.get({ products: [] }, (data) => {
                        const products = data.products.map(product => 
                            product.id === id ? { id, name, price, link, image } : product
                        );
                        chrome.storage.sync.set({ products }, () => {
                            document.getElementById('status').textContent = 'Product updated successfully!';
                            setTimeout(() => {
                                document.getElementById('status').textContent = '';
                            }, 1000);
                            loadProducts();
                            updateContentScript(); // Content script に通知
                        });
                    });
                } else {
                    document.getElementById('status').textContent = 'Please fill in all fields.';
                }
            });
        });

        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', () => {
                const id = parseInt(button.getAttribute('data-id'), 10);

                chrome.storage.sync.get({ products: [] }, (data) => {
                    const products = data.products.filter(product => product.id !== id);
                    chrome.storage.sync.set({ products }, () => {
                        document.getElementById('status').textContent = 'Product deleted successfully!';
                        setTimeout(() => {
                            document.getElementById('status').textContent = '';
                        }, 1000);
                        loadProducts();
                        updateContentScript(); // Content script に通知
                    });
                });
            });
        });
    });
}

// Content script に通知する関数
function updateContentScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'updateProducts' });
        }
    });
}

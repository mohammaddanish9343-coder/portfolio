(() => {
    const navbar = document.getElementById('navbar');
    const menuToggle = document.querySelector('.menu-toggle');
    const contactForm = document.getElementById('contactForm');

    window.toggleMenu = function toggleMenu() {
        if (navbar) {
            navbar.classList.toggle('active');
        }
    };

    if (navbar) {
        navbar.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                navbar.classList.remove('active');
            });
        });
    }

    document.addEventListener('click', (event) => {
        if (!navbar || !menuToggle) {
            return;
        }

        const clickedInsideNav = navbar.contains(event.target);
        const clickedMenuToggle = menuToggle.contains(event.target);

        if (!clickedInsideNav && !clickedMenuToggle) {
            navbar.classList.remove('active');
        }
    });

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (event) => {
            const href = anchor.getAttribute('href');
            if (!href || href === '#') {
                return;
            }

            const target = document.querySelector(href);
            if (!target) {
                return;
            }

            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    if (contactForm) {
        contactForm.addEventListener('submit', async function handleSubmit(event) {
            event.preventDefault();

            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton ? submitButton.textContent : '';

            if (submitButton) {
                submitButton.textContent = 'Sending...';
                submitButton.disabled = true;
            }

            const payload = {
                name: this.querySelector('#name')?.value?.trim() || '',
                email: this.querySelector('#email')?.value?.trim() || '',
                message: this.querySelector('#message')?.value?.trim() || ''
            };

            try {
                const response = await fetch('http://localhost:5000/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                let data = {};
                try {
                    data = await response.json();
                } catch {
                    data = {};
                }

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to send message.');
                }

                showNotification('Message saved to database.', 'success');
                this.reset();
            } catch (error) {
                showNotification(error.message || 'Something went wrong.', 'error');
            } finally {
                if (submitButton) {
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                }
            }
        });
    }

    injectNotificationStyles();

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        requestAnimationFrame(() => {
            notification.classList.add('visible');
        });

        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function injectNotificationStyles() {
        if (document.getElementById('notification-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                color: #fff;
                padding: 12px 16px;
                border-radius: 6px;
                box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
                z-index: 1000;
                transform: translateX(120%);
                opacity: 0;
                transition: transform 0.3s ease, opacity 0.3s ease;
            }

            .notification.visible {
                transform: translateX(0);
                opacity: 1;
            }

            .notification-success {
                background: #248a2a;
            }

            .notification-error {
                background: #b42318;
            }
        `;
        document.head.appendChild(style);
    }
})();

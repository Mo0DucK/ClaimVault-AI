import stripe
import os
from config import Config

stripe.api_key = Config.STRIPE_SECRET_KEY

def create_checkout_session(item_type, user_email, success_url, cancel_url, metadata=None):
    if item_type == 'kit':
        price_id = Config.STRIPE_KIT_PRICE_ID
        mode = 'payment'
    else:
        price_id = Config.STRIPE_SUBSCRIPTION_PRICE_ID
        mode = 'subscription'
        
    try:
        checkout_session = stripe.checkout.Session.create(
            line_items=[
                {
                    'price': price_id,
                    'quantity': 1,
                },
            ],
            mode=mode,
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=user_email,
            metadata=metadata
        )
        return checkout_session.url
    except Exception as e:
        print(f"Error creating checkout session: {e}")
        return None

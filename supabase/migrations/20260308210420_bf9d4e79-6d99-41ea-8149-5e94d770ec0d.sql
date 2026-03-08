
-- Trigger to notify buyer and seller on order status changes
CREATE OR REPLACE FUNCTION public.notify_on_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_product_title TEXT;
  v_service_title TEXT;
  v_item_name TEXT;
BEGIN
  -- Only fire on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get item name
  IF NEW.product_id IS NOT NULL THEN
    SELECT title INTO v_product_title FROM products WHERE id = NEW.product_id;
    v_item_name := COALESCE(v_product_title, 'Produit');
  ELSIF NEW.service_id IS NOT NULL THEN
    SELECT title INTO v_service_title FROM services WHERE id = NEW.service_id;
    v_item_name := COALESCE(v_service_title, 'Service');
  ELSE
    v_item_name := 'Commande';
  END IF;

  -- Notify buyer
  IF NEW.status = 'confirmed' THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (NEW.buyer_id, 'order', '✅ Commande confirmée', 
      'Votre commande "' || v_item_name || '" a été confirmée par le vendeur.',
      jsonb_build_object('order_id', NEW.id, 'status', NEW.status));
  ELSIF NEW.status = 'shipped' THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (NEW.buyer_id, 'order', '📦 Commande expédiée',
      'Votre commande "' || v_item_name || '" est en route !',
      jsonb_build_object('order_id', NEW.id, 'status', NEW.status, 'tracking', NEW.tracking_number));
  ELSIF NEW.status = 'completed' THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (NEW.seller_id, 'order', '🎉 Commande livrée',
      'La commande "' || v_item_name || '" a été reçue. Le paiement sera versé.',
      jsonb_build_object('order_id', NEW.id, 'status', NEW.status));
  ELSIF NEW.status = 'cancelled' THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (NEW.seller_id, 'order', '❌ Commande annulée',
      'La commande "' || v_item_name || '" a été annulée.',
      jsonb_build_object('order_id', NEW.id, 'status', NEW.status));
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (NEW.buyer_id, 'order', '❌ Commande annulée',
      'Votre commande "' || v_item_name || '" a été annulée.',
      jsonb_build_object('order_id', NEW.id, 'status', NEW.status));
  END IF;

  -- Notify seller on new order
  IF OLD.status IS NULL OR (OLD.status = 'pending' AND NEW.status = 'pending') THEN
    NULL; -- handled by create_secure_order or other trigger
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to orders
CREATE TRIGGER trg_order_status_notify
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_order_status_change();

-- Notify seller on new order creation
CREATE OR REPLACE FUNCTION public.notify_seller_on_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item_name TEXT;
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    SELECT title INTO v_item_name FROM products WHERE id = NEW.product_id;
  ELSIF NEW.service_id IS NOT NULL THEN
    SELECT title INTO v_item_name FROM services WHERE id = NEW.service_id;
  END IF;
  v_item_name := COALESCE(v_item_name, 'Article');

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (NEW.seller_id, 'order', '🛒 Nouvelle commande !',
    'Vous avez reçu une commande pour "' || v_item_name || '" (' || NEW.total_price || ' FCFA)',
    jsonb_build_object('order_id', NEW.id, 'total', NEW.total_price));
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_order_notify_seller
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_on_new_order();

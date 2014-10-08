## Build a Shopping Cart with Marionette

![Shopping Cart](https://codingsomething.files.wordpress.com/2014/10/shopping-cart2.png?w=272)

### [MarionetteJS](http://marionettejs.com) adds to Backbone a structure to build large event-driven applications.

This article explains how to build a fully functional shopping cart with [MarionetteJS](http://marionettejs.com) and [Apiary](http://apiary.io) using a [CompositeView](http://marionettejs.com/docs/marionette.compositeview.html) and [modules](http://marionettejs.com/docs/marionette.module.html).

## Spec

Before start lets think about what features we want implement in this first Shopping Cart version, so our module should:

* Load the data from the server regardless.
* Be able to add and remove items form the server.
* Modify some current item attributes (quantity)

## API REST

First of all, we will create a simple API to simulate the server side.
Basically this will let us to **read** the collection, **update** and **delete** a model from the collection.

![Apiary API](https://codingsomething.files.wordpress.com/2014/10/marionette-shopping-cart-apiary1.png?w=800)
[http://docs.marionetteshoppingcart.apiary.io](http://docs.marionetteshoppingcart.apiary.io)


## Cart module

We’ll suppose at some point before the cart module is loaded we initialize our App object, something like:
```js
var App = new Backbone.Marionette.Application({});
````
*To avoid global objects you can use [requirejs](http://requirejs.org/).*

After that we’ll define our module with all classes and the initializer:
```js
App.module('Cart', function(Cart, App) {
// our code will go here
});
```

### ProductModel
Default model values.
```js
this.ProductModel = Backbone.Model.extend({
    defaults: {
        id: null,
        title: '',
        url: '',
        variation: 466,
        image: null,
        quantity: 1,
        price: 0
    }
});
```

### ProductsCollection
This collection is listening for **'add:cart'** event so we can keep this cart ‘module’ connected to the rest of our application.  
* __getSubtotal:__ returns all product prices x quantity
```js
this.ProductsCollection = Backbone.Collection.extend({
    model: Cart.ProductModel,
    url: 'http://marionetteshoppingcart.apiary-mock.com/products',
    initialize: function(){
        var self = this;
        this.listenTo(App, 'add:cart', function(model){
            self.create(model, {wait:true});
        });
    },
    getSubtotal: function() {
        var subtotal = 0;
        var data = _.map(this.toJSON(), function(item) {
           subtotal += Number(item.quantity * item.price);
        });
        return subtotal;
    }
});
```

### ProductCartView
This view will listen for click on delete button and quantity attribute changes:
* __'change:quantity':__ will re-render the view to show the new price and make a little ‘blink’ effect.
* __removeProduct:__ will destroy the model in the server, so we’ll wait the response to remove the view. That’s because there are a enable disable methods.
```html
<script id="cart-product-template" type="text/html">
    <td class="image">
        <a href="<%= url %>">
            <img src="<%= image  %>" alt="<%= title %>">
        </a>
    </td>
    <td class="description">
        <a href="<%= url %>">
            <p><%= title %></p>
            <p class="price"><%= price %> €</p>
        </a>
        <a class="delete-button">&nbsp;</a>
    </td>
</script>
```
```js
this.ProductCartView = Backbone.Marionette.ItemView.extend({
    template: '#cart-product-template',
    tagName: "tr",
    ui: {
        delete: '.delete-button'
    },
    events: {
        'click @ui.delete': 'removeProduct'
    },
    modelEvents: {
        'change:quantity': 'render blink'
    },
    serializeData: function() {
        return _.extend(this.model.toJSON(), {
            'price': Number(this.model.get('price') * this.model.get('quantity'))
        });
    },
    blink: function() {
        this.$el.hide().fadeIn();
    },
    enableProduct: function() {
        this.$el.fadeTo(150, 1);
        this.ui.delete.removeClass('disabled');
    },
    disableProduct: function() {
        this.$el.fadeTo(150, 0.5);
        this.ui.delete.addClass('disabled');
    },
    removeProduct: function(event) {
 
        if (this.ui.delete.hasClass('disabled')) {
            event.preventDefault();
            return;
        }
 
        this.disableProduct();
        
        this.model.destroy({
            wait: true,
            error: _.bind(this.enableProduct, this)
        });
    }
});
```

### EmptyCartView
MarionetteJS let you show a class (emptyView) when your collection is empty, this saves you some time, under my point of view is useful but you can avoid it.
```html
<script id="cart-empty-template" type="text/html">
    <td class="empty">Your cart is empty.</td>
</script>
```
```js
this.EmptyCartView = Backbone.Marionette.ItemView.extend({
    template: '#cart-empty-template',
    tagName: 'tr'
});
```

### CartView
Basically this class only listen the collection changes in order to render the subtotal price.
```html
<script id="cart-template" type="text/html">
    <h3 class="header-3">Your cart <span class="subtotal"></span></h3>
    <table>
        <tbody>
        </tbody>
    </table>
    <a href="/go-checkout" class="button action">go checkout</a>
</script>
```
```js
this.CartView = Backbone.Marionette.CompositeView.extend({
    template: '#cart-template',
    childViewContainer: 'tbody',
    childView: Cart.ProductCartView,
    emptyView: Cart.EmptyCartView,
 
    ui: {
        button: '.button',
        subtotal: '.subtotal'
    },
 
    initialize: function() {
        this.listenTo(this, 'render:empty', this.disableCart);
    },
 
    collectionEvents: {
        'reset': 'render',
        'reset add remove change:quantity': 'setSubtotal',
        'reset add': 'enableCart'
    },
 
    events: {
        'click @ui.button': 'clickCartButton'
    },
 
    setSubtotal: function() {
        var subtotal = this.collection.getSubtotal();
        this.ui.subtotal.hide();
        if (Boolean(subtotal)) {
            this.ui.subtotal.html(String(subtotal+' €')); 
            // this is very dirty.. i know
            this.ui.subtotal.fadeTo(80, 0.1).fadeTo(80, 1.0).fadeTo(80, 0.1).fadeTo(160, 1.0);
        }
    },
 
    disableCart: function() {
        this.ui.button.addClass('disabled');
    },
 
    enableCart: function() {
        this.ui.button.removeClass('disabled');
    },
 
    clickCartButton: function(event) {
        if (this.ui.button.hasClass('disabled')) {
            event.preventDefault();
        }
    }
});
```

## Initializing the module

```js
App.addInitializer(function(){
    var products = new Cart.ProductsCollection();
    var cart = new Cart.CartView({
        el: '#shopping-cart',
        collection: products
    });
    products.fetch({reset:true});
});
```
Now our module will initialize at start:
```js
App.start({});
```

You can read the [article here](http://codingsomething.wordpress.com/2014/10/08/build-a-shoppping-cart-with-marionettejs/).
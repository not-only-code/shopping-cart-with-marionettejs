App.module('Cart', function(Cart, App) {

    this.ProductModel = Backbone.Model.extend({
        defaults: {
            id: null,
            title: '',
            url: '',
            variation: 466,
            image: null,
            quantity: 1,
            price: 0
        },
        addQuantity: function(quantity) {
            if (!quantity || !_.isNumber(quantity)) {
                return;
            }
            this.set('quantity', Number(this.get('quantity') + quantity));
        }
    });

    this.ProductsCollection = Backbone.Collection.extend({
        model: Cart.ProductModel,
        url: 'http://marionetteshoppingcart.apiary-mock.com/products',
        initialize: function(){
            var self = this;
            this.listenTo(App, 'add:cart', function(model){
                self.create(model, {wait:true});
            });
        },
        add: function(models, options) {

            if (!_.isArray(models)) {
                models = [models];
            }

            this.each(function(model){
                _.each(models, function(m){
                    if (m instanceof Cart.models.Product) {
                        m = m.toJSON();
                    }
                    if (model.id === m.id) {
                        model.addQuantity(m.quantity);
                    }
                });
            });

            return this.set(models, _.extend({merge: false}, options, {add: true, remove: false}));
        },
        getSubtotal: function() {
            var subtotal = 0;
            var data = _.map(this.toJSON(), function(item) {
               subtotal += Number(item.quantity * item.price);
            });
            return subtotal;
        },
        getQuantity: function() {
            if (!this.length) {
                return this.length;
            }
            var p = _.pluck(this.toJSON(), 'quantity');
            return _.reduce(p, function(memo, num){ return memo + num; }, 0);
        }
    });

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

    this.EmptyCartView = Backbone.Marionette.ItemView.extend({
        template: '#cart-empty-template',
        tagName: 'tr'
    });

    this.CartView = Backbone.Marionette.CompositeView.extend({
        template: '#cart-template',
        childView: Cart.ProductCartView,
        childViewContainer: 'tbody',
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
            'click @ui.button': 'clickButton'
        },

        setSubtotal: function() {
            var subtotal = this.collection.getSubtotal();
            this.ui.subtotal.hide();
            if (Boolean(subtotal)) {
                this.ui.subtotal.html(String(subtotal+' €'));  
                this.ui.subtotal.fadeTo(80, 0.1).fadeTo(80, 1.0).fadeTo(80, 0.1).fadeTo(160, 1.0);
            }
        },

        disableCart: function() {
            this.ui.button.addClass('disabled');
        },

        enableCart: function() {
            this.ui.button.removeClass('disabled');
        },

        clickButton: function(event) {
            if (this.ui.button.hasClass('disabled')) {
                event.preventDefault();
            }
        }
    });

    App.addInitializer(function(){
        var products = new Cart.ProductsCollection();
        var cart = new Cart.CartView({
            el: '#shopping-cart',
            collection: products
        });
        products.fetch({reset:true});
    })

});
(function() {
  rivets.binders.input = {
    publishes: true,
    routine: rivets.binders.value.routine,
    bind: function(el) {
      return el.addEventListener('input', this.publish);
    },
    unbind: function(el) {
      return el.removeEventListener('input', this.publish);
    }
  };

  rivets.configure({
    prefix: "rv",
    adapter: {
      subscribe: function(obj, keypath, callback) {
        callback.wrapped = function(m, v) {
          return callback(v);
        };
        return obj.on('change:' + keypath, callback.wrapped);
      },
      unsubscribe: function(obj, keypath, callback) {
        return obj.off('change:' + keypath, callback.wrapped);
      },
      read: function(obj, keypath) {
        if (keypath === "cid") {
          return obj.cid;
        }
        return obj.get(keypath);
      },
      publish: function(obj, keypath, value) {
        if (obj.cid) {
          return obj.set(keypath, value);
        } else {
          return obj[keypath] = value;
        }
      }
    }
  });

}).call(this);

(function() {
  window.FormBuilder || (window.FormBuilder = {});

  FormBuilder.all_fields = {};

  FormBuilder.input_fields = {};

  FormBuilder.non_input_fields = {};

  FormBuilder.helpers = {};

  FormBuilder.models = {};

  FormBuilder.views = {};

  FormBuilder.collections = {};

  FormBuilder.helpers.defaultFieldAttrs = function(field_type) {
    var attrs, _base;
    attrs = {
      label: "Untitled",
      field_type: field_type,
      field_options: {
        required: true
      }
    };
    return (typeof (_base = FormBuilder.all_fields[field_type]).defaultAttributes === "function" ? _base.defaultAttributes(attrs) : void 0) || attrs;
  };

  FormBuilder.helpers.simple_format = function(x) {
    return x != null ? x.replace(/\n/g, '<br />') : void 0;
  };

  FormBuilder.registerField = function(name, opts) {
    var x, _i, _len, _ref;
    _ref = ['view', 'edit'];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      x = _ref[_i];
      opts[x] = _.template(opts[x]);
    }
    FormBuilder.all_fields[name] = opts;
    if (opts.type === 'non_input') {
      return FormBuilder.non_input_fields[name] = opts;
    } else {
      return FormBuilder.input_fields[name] = opts;
    }
  };

  FormBuilder.views.view_field = Backbone.View.extend({
    className: "response-field-wrapper",
    events: {
      'click .subtemplate-wrapper': 'focusEditView',
      'click .js-duplicate': 'duplicate',
      'click .js-clear': 'clear'
    },
    initialize: function() {
      this.parentView = this.options.parentView;
      this.listenTo(this.model, "change", this.render);
      return this.listenTo(this.model, "destroy", this.remove);
    },
    render: function() {
      this.$el.addClass('response-field-' + this.model.get('field_type')).data('cid', this.model.cid).html(FormBuilder.templates["view/base" + (!this.model.is_input() ? '_non_input' : '')]({
        rf: this.model
      }));
      return this;
    },
    focusEditView: function() {
      return this.parentView.createAndShowEditView(this.model);
    },
    clear: function() {
      this.parentView.handleFormUpdate();
      return this.model.destroy();
    },
    duplicate: function() {
      var attrs;
      attrs = _.clone(this.model.attributes);
      delete attrs['id'];
      attrs['label'] += ' Copy';
      return this.parentView.createField(attrs, {
        position: this.model.indexInDOM() + 1
      });
    }
  });

  FormBuilder.views.edit_field = Backbone.View.extend({
    className: "edit-response-field",
    events: {
      'click .js-add-option': 'addOption',
      'click .js-remove-option': 'removeOption',
      'click .js-default-updated': 'defaultUpdated',
      'input .option-label-input': 'forceRender'
    },
    initialize: function() {
      this.listenTo(this.model, "destroy", this.remove);
      return this.listenTo(this.model, "change:field_options.review_this_field", this.auditReviewThisFieldChanged);
    },
    render: function() {
      this.$el.html(FormBuilder.templates["edit/base" + (!this.model.is_input() ? '_non_input' : '')]({
        rf: this.model
      }));
      rivets.bind(this.$el, {
        model: this.model
      });
      return this;
    },
    remove: function() {
      this.options.parentView.editView = void 0;
      this.options.parentView.$el.find("[href=\"#addField\"]").click();
      return Backbone.View.prototype.remove.call(this);
    },
    addOption: function(e) {
      var $el, i, newOption, options;
      $el = $(e.currentTarget);
      i = this.$el.find('.option').index($el.closest('.option'));
      options = this.model.get("field_options.options") || [];
      newOption = {
        label: "",
        checked: false
      };
      if (i > -1) {
        options.splice(i + 1, 0, newOption);
      } else {
        options.push(newOption);
      }
      return this.model.set("field_options.options", options);
    },
    removeOption: function(e, $el) {
      var index, options;
      index = this.$el.find(".js-remove-option").index($el);
      options = this.model.get("field_options.options");
      options.splice(index, 1);
      return this.model.set("field_options.options", options);
    },
    defaultUpdated: function(e) {
      var $el;
      $el = $(e.currentTarget);
      if (this.model.get('field_type') !== 'checkboxes') {
        this.$el.find(".js-default-updated").not($el).attr('checked', false).trigger('change');
      }
      return this.forceRender();
    },
    forceRender: function() {
      return this.model.trigger('change');
    }
  });

  FormBuilder.models.response_field = Backbone.DeepModel.extend({
    sync: function() {},
    indexInDOM: function() {
      var $wrapper,
        _this = this;
      $wrapper = $(".response-field-wrapper").filter((function(_, el) {
        return $(el).data('cid') === _this.cid;
      }));
      return $(".response-field-wrapper").index($wrapper);
    },
    is_input: function() {
      return FormBuilder.input_fields[this.get('field_type')] != null;
    }
  });

  FormBuilder.collections.response_fields = Backbone.Collection.extend({
    model: FormBuilder.models.response_field,
    comparator: function(model) {
      return model.indexInDOM();
    },
    addCidsToModels: function() {
      return this.each(function(model) {
        return model.attributes.cid = model.cid;
      });
    }
  });

  FormBuilder.main = Backbone.View.extend({
    el: "#formBuilder",
    SUBVIEWS: [],
    events: {
      'click .js-save-form': 'saveForm',
      'click .fb-tabs a': 'showTab',
      'click .fb-add-field-types a': 'addField'
    },
    initialize: function() {
      this.collection = new FormBuilder.collections.response_fields;
      this.collection.bind('add', this.addOne, this);
      this.collection.bind('reset', this.reset, this);
      this.collection.bind('change', this.handleFormUpdate, this);
      this.collection.bind('destroy add reset', this.hideShowNoResponseFields, this);
      this.collection.bind('destroy', this.ensureEditViewScrolled, this);
      this.render();
      this.collection.reset(this.options.bootstrapData);
      return this.initAutosave();
    },
    initAutosave: function() {
      var _this = this;
      this.formSaved = true;
      this.saveFormButton = this.$el.find(".js-save-form");
      setInterval(function() {
        return _this.saveForm.call(_this);
      }, 5000);
      return $(window).bind('beforeunload', function() {
        if (_this.formSaved) {
          return void 0;
        } else {
          return 'You have unsaved changes. If you leave this page, you will lose those changes!';
        }
      });
    },
    reset: function() {
      this.$responseFields.html('');
      return this.addAll();
    },
    render: function() {
      var subview, _i, _len, _ref;
      this.$el.html(FormBuilder.templates['page']());
      this.$fbLeft = this.$el.find('.fb-left');
      this.$responseFields = this.$el.find('.fb-response-fields');
      this.bindWindowScrollEvent();
      this.hideShowNoResponseFields();
      _ref = this.SUBVIEWS;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        subview = _ref[_i];
        new subview({
          parentView: this
        }).render();
      }
      return this;
    },
    bindWindowScrollEvent: function() {
      var _this = this;
      return $(window).on('scroll', function() {
        var maxMargin, newMargin;
        if (_this.$fbLeft.data('locked') === true) {
          return;
        }
        newMargin = Math.max(0, $(window).scrollTop());
        maxMargin = _this.$responseFields.height();
        return _this.$fbLeft.css({
          'margin-top': Math.min(maxMargin, newMargin)
        });
      });
    },
    showTab: function(e) {
      var $el, first_model, target;
      $el = $(e.currentTarget);
      target = $el.data('target');
      $el.closest('li').addClass('active').siblings('li').removeClass('active');
      $(target).addClass('active').siblings('.fb-tab-pane').removeClass('active');
      if (target !== '#editField') {
        this.unlockLeftWrapper();
      }
      if (target === '#editField' && !this.editView && (first_model = this.collection.models[0])) {
        return this.createAndShowEditView(first_model);
      }
    },
    addOne: function(responseField, _, options) {
      var $replacePosition, view;
      view = new FormBuilder.views.view_field({
        model: responseField,
        parentView: this
      });
      if (options.$replaceEl != null) {
        return options.$replaceEl.replaceWith(view.render().el);
      } else if ((options.position == null) || options.position === -1) {
        return this.$responseFields.append(view.render().el);
      } else if (options.position === 0) {
        return this.$responseFields.prepend(view.render().el);
      } else if (($replacePosition = this.$responseFields.find(".response-field-wrapper").eq(options.position))[0]) {
        return $replacePosition.before(view.render().el);
      } else {
        return this.$responseFields.append(view.render().el);
      }
    },
    setSortable: function() {
      var _this = this;
      if (this.$responseFields.hasClass('ui-sortable')) {
        this.$responseFields.sortable('destroy');
      }
      this.$responseFields.sortable({
        forcePlaceholderSize: true,
        placeholder: 'sortable-placeholder',
        stop: function(e, ui) {
          var field_type, pos, rf;
          if (ui.item.is('a')) {
            field_type = ui.item.data('field-type');
            pos = $(".response-field-wrapper").index(ui.item.next(".response-field-wrapper"));
            rf = _this.collection.create(FormBuilder.helpers.defaultFieldAttrs(field_type), {
              $replaceEl: ui.item
            });
            _this.createAndShowEditView(rf);
          }
          return _this.handleFormUpdate();
        },
        update: function(e, ui) {
          if (!ui.item.hasClass('btn')) {
            return _this.ensureEditViewScrolled();
          }
        }
      });
      return this.setDraggable();
    },
    setDraggable: function() {
      var $addFieldButtons,
        _this = this;
      $addFieldButtons = this.$el.find(".fb-add-field-types a");
      return $addFieldButtons.draggable({
        connectToSortable: this.$responseFields,
        helper: function() {
          var $helper;
          $helper = $("<div class='response-field-draggable-helper' />");
          $helper.css({
            width: _this.$responseFields.width(),
            height: '80px'
          });
          return $helper;
        }
      });
    },
    addAll: function() {
      this.collection.each(this.addOne, this);
      return this.setSortable();
    },
    hideShowNoResponseFields: function() {
      return this.$el.find(".fb-no-response-fields")[this.collection.length > 0 ? 'hide' : 'show']();
    },
    addField: function(e) {
      var field_type;
      field_type = $(e.currentTarget).data('field-type');
      return this.createField(FormBuilder.helpers.defaultFieldAttrs(field_type));
    },
    createField: function(attrs, options) {
      var rf;
      rf = this.collection.create(attrs, options);
      this.createAndShowEditView(rf);
      return this.handleFormUpdate();
    },
    createAndShowEditView: function(model) {
      var $newEditEl, $responseFieldEl, oldPadding;
      $responseFieldEl = this.$el.find(".response-field-wrapper").filter(function() {
        return $(this).data('cid') === model.cid;
      });
      $responseFieldEl.addClass('editing').siblings('.response-field-wrapper').removeClass('editing');
      if (this.editView) {
        if (this.editView.model.cid === model.cid) {
          this.$el.find(".fb-tabs a[data-target=\"#editField\"]").click();
          this.scrollLeftWrapper($responseFieldEl, (typeof oldPadding !== "undefined" && oldPadding !== null) && oldPadding);
          return;
        }
        oldPadding = this.$fbLeft.css('padding-top');
        this.editView.remove();
      }
      this.editView = new FormBuilder.views.edit_field({
        model: model,
        parentView: this
      });
      $newEditEl = this.editView.render().$el;
      this.$el.find("#edit-response-field-wrapper").html($newEditEl);
      this.$el.find(".fb-tabs a[data-target=\"#editField\"]").click();
      this.scrollLeftWrapper($responseFieldEl);
      return this;
    },
    ensureEditViewScrolled: function() {
      if (!this.editView) {
        return;
      }
      return this.scrollLeftWrapper($(".response-field-wrapper.editing"));
    },
    scrollLeftWrapper: function($responseFieldEl) {
      var _this = this;
      this.unlockLeftWrapper();
      return $.scrollWindowTo($responseFieldEl.offset().top - this.$responseFields.offset().top, 200, function() {
        return _this.lockLeftWrapper();
      });
    },
    lockLeftWrapper: function() {
      return this.$fbLeft.data('locked', true);
    },
    unlockLeftWrapper: function() {
      return this.$fbLeft.data('locked', false);
    },
    handleFormUpdate: function() {
      if (this.updatingBatch) {
        return;
      }
      return this.formSaved = false;
    },
    saveForm: function(e) {
      var _ref,
        _this = this;
      if (this.formSaved === true) {
        return;
      }
      this.formSaved = true;
      this.collection.sort();
      this.collection.addCidsToModels();
      this.collection.trigger('batchUpdate');
      return $.ajax({
        url: "/response_fields/batch?" + this.collection.urlParams,
        type: "PUT",
        contentType: "application/json",
        data: JSON.stringify({
          response_fields: this.collection.toJSON(),
          form_options: (_ref = this.response_fieldable) != null ? _ref.toJSON() : void 0
        }),
        success: function(data) {
          var datum, _i, _len, _ref1;
          _this.updatingBatch = true;
          for (_i = 0, _len = data.length; _i < _len; _i++) {
            datum = data[_i];
            if ((_ref1 = _this.collection.get(datum.cid)) != null) {
              _ref1.set({
                id: datum.id
              });
            }
            _this.collection.trigger('sync');
          }
          return _this.updatingBatch = void 0;
        }
      });
    }
  });

}).call(this);

(function() {
  FormBuilder.registerField('address', {
    view: "<div class='input-line'>\n  <span class='street'>\n    <input type='text' />\n    <label>Address</label>\n  </span>\n</div>\n\n<div class='input-line'>\n  <span class='city'>\n    <input type='text' />\n    <label>City</label>\n  </span>\n\n  <span class='state'>\n    <input type='text' />\n    <label>State / Province / Region</label>\n  </span>\n</div>\n\n<div class='input-line'>\n  <span class='zip'>\n    <input type='text' />\n    <label>Zipcode</label>\n  </span>\n\n  <span class='country'>\n    <select></select>\n    <label>Country</label>\n  </span>\n</div>",
    edit: "",
    addButton: "<span class=\"symbol\"><span class=\"icon-home\"></span></span> Address"
  });

}).call(this);

(function() {
  FormBuilder.registerField('checkboxes', {
    view: "<% for (i in (rf.get('field_options.options') || [])) { %>\n  <div>\n    <label>\n      <input type='checkbox' <%= rf.get('field_options.options')[i].checked && 'checked' %> onclick=\"javascript: return false;\" />\n      <%= rf.get('field_options.options')[i].label %>\n    </label>\n  </div>\n<% } %>\n\n<% if (rf.get('field_options.include_other_option')) { %>\n  <div class='other-option'>\n    <label>\n      <input type='checkbox' />\n      Other\n    </label>\n\n    <input type='text' />\n  </div>\n<% } %>",
    edit: "<%= FormBuilder.templates['edit/options']({ includeOther: true }) %>",
    addButton: "<span class=\"symbol\"><span class=\"icon-check-empty\"></span></span> Checkboxes",
    defaultAttributes: function(attrs) {
      attrs.field_options.options = [
        {
          label: "",
          checked: false
        }, {
          label: "",
          checked: false
        }
      ];
      return attrs;
    }
  });

}).call(this);

(function() {
  FormBuilder.registerField('date', {
    view: "<div class='input-line'>\n  <span class='month'>\n    <input type=\"text\" />\n    <label>MM</label>\n  </span>\n\n  <span class='above-line'>/</span>\n\n  <span class='day'>\n    <input type=\"text\" />\n    <label>DD</label>\n  </span>\n\n  <span class='above-line'>/</span>\n\n  <span class='year'>\n    <input type=\"text\" />\n    <label>YYYY</label>\n  </span>\n</div>",
    edit: "",
    addButton: "<span class=\"symbol\"><span class=\"icon-calendar\"></span></span> Date"
  });

}).call(this);

(function() {
  FormBuilder.registerField('dropdown', {
    view: "<select>\n  <% if (rf.get('field_options.include_blank_option')) { %>\n    <option value=''></option>\n  <% } %>\n\n  <% for (i in (rf.get('field_options.options') || [])) { %>\n    <option <%= rf.get('field_options.options')[i].checked && 'selected' %>>\n      <%= rf.get('field_options.options')[i].label %>\n    </option>\n  <% } %>\n</select>",
    edit: "<%= FormBuilder.templates['edit/options']({ includeBlank: true }) %>",
    addButton: "<span class=\"symbol\"><span class=\"icon-caret-down\"></span></span> Dropdown",
    defaultAttributes: function(attrs) {
      attrs.field_options.options = [
        {
          label: "",
          checked: false
        }, {
          label: "",
          checked: false
        }
      ];
      attrs.field_options.include_blank_option = false;
      return attrs;
    }
  });

}).call(this);

(function() {
  FormBuilder.registerField('email', {
    view: "<input type='text' class='rf-size-<%= rf.get('field_options.size') %>' />",
    edit: "",
    addButton: "<span class=\"symbol\"><span class=\"icon-envelope-alt\"></span></span> Email"
  });

}).call(this);

(function() {
  FormBuilder.registerField('file', {
    view: "<input type='file' />",
    edit: "",
    addButton: "<span class=\"symbol\"><span class=\"icon-cloud-upload\"></span></span> File"
  });

}).call(this);

(function() {
  FormBuilder.registerField('number', {
    view: "<input type='text' />\n<% if (units = rf.get('field_options.units')) { %>\n  <%= units %>\n<% } %>",
    edit: "<%= FormBuilder.templates['edit/min_max']() %>\n<%= FormBuilder.templates['edit/units']() %>\n<%= FormBuilder.templates['edit/integer_only']() %>",
    addButton: "<span class=\"symbol\"><span class=\"icon-number\">123</span></span> Number"
  });

}).call(this);

(function() {
  FormBuilder.registerField('paragraph', {
    view: "<textarea class='rf-size-<%= rf.get('field_options.size') %>'></textarea>",
    edit: "<%= FormBuilder.templates['edit/size']() %>\n<%= FormBuilder.templates['edit/min_max_length']() %>",
    addButton: "<span class=\"symbol\">&#182;</span> Paragraph"
  });

}).call(this);

(function() {
  FormBuilder.registerField('price', {
    view: "<div class='input-line'>\n  <span class='above-line'>$</span>\n  <span class='dolars'>\n    <input type='text' />\n    <label>Dollars</label>\n  </span>\n  <span class='above-line'>.</span>\n  <span class='cents'>\n    <input type='text' />\n    <label>Cents</label>\n  </span>\n</div>",
    edit: "",
    addButton: "<span class=\"symbol\"><span class=\"icon-dollar\"></span></span> Price"
  });

}).call(this);

(function() {
  FormBuilder.registerField('radio', {
    view: "<% for (i in (rf.get('field_options.options') || [])) { %>\n  <div>\n    <label>\n      <input type='radio' <%= rf.get('field_options.options')[i].checked && 'checked' %> onclick=\"javascript: return false;\" />\n      <%= rf.get('field_options.options')[i].label %>\n    </label>\n  </div>\n<% } %>\n\n<% if (rf.get('field_options.include_other_option')) { %>\n  <div class='other-option'>\n    <label>\n      <input type='radio' />\n      Other\n    </label>\n\n    <input type='text' />\n  </div>\n<% } %>",
    edit: "<%= FormBuilder.templates['edit/options']({ includeOther: true }) %>",
    addButton: "<span class=\"symbol\"><span class=\"icon-circle-blank\"></span></span> Multiple Choice",
    defaultAttributes: function(attrs) {
      attrs.field_options.options = [
        {
          label: "",
          checked: false
        }, {
          label: "",
          checked: false
        }
      ];
      return attrs;
    }
  });

}).call(this);

(function() {
  FormBuilder.registerField('section_break', {
    type: 'non_input',
    view: "<label class='section-name'><%= rf.get('label') %></label>\n<p><%= rf.get('field_options.description') %></p>",
    edit: "<div class='fb-edit-section-header'>Label</div>\n<input type='text' data-rv-input='model.label' />\n<textarea data-rv-input='model.field_options.description' placeholder='Add a longer description to this field'></textarea>",
    addButton: "<span class='symbol'><span class='icon-minus'></span></span> Section Break"
  });

}).call(this);

(function() {
  FormBuilder.registerField('text', {
    view: "<input type='text' class='rf-size-<%= rf.get('field_options.size') %>' />",
    edit: "<%= FormBuilder.templates['edit/size']() %>\n<%= FormBuilder.templates['edit/min_max_length']() %>",
    addButton: "<span class='symbol'><span class='icon-font'></span></span> Text"
  });

}).call(this);

(function() {
  FormBuilder.registerField('time', {
    view: "<div class='input-line'>\n  <span class='hours'>\n    <input type=\"text\" />\n    <label>HH</label>\n  </span>\n\n  <span class='above-line'>:</span>\n\n  <span class='minutes'>\n    <input type=\"text\" />\n    <label>MM</label>\n  </span>\n\n  <span class='above-line'>:</span>\n\n  <span class='seconds'>\n    <input type=\"text\" />\n    <label>SS</label>\n  </span>\n\n  <span class='am_pm'>\n    <select>\n      <option>AM</option>\n      <option>PM</option>\n    </select>\n  </span>\n</div>",
    edit: "",
    addButton: "<span class=\"symbol\"><span class=\"icon-time\"></span></span> Time"
  });

}).call(this);

(function() {
  FormBuilder.registerField('website', {
    view: "<input type='text' class='rf-size-<%= rf.get('field_options.size') %>' placeholder='http://' />",
    edit: "<%= FormBuilder.templates['edit/size']() %>",
    addButton: "<span class=\"symbol\"><span class=\"icon-link\"></span></span> Website"
  });

}).call(this);

this["FormBuilder"] = this["FormBuilder"] || {};
this["FormBuilder"]["templates"] = this["FormBuilder"]["templates"] || {};

this["FormBuilder"]["templates"]["edit/base"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class=\'fb-field-label\'>\n  <span data-rv-text="model.label"></span>\n  <code class=\'field-type\' data-rv-text=\'model.field_type\'></code>\n  <span class=\'icon-arrow-right pull-right\'></span>\n</div>\n' +
((__t = ( FormBuilder.templates['edit/common']() )) == null ? '' : __t) +
'\n\n' +
((__t = ( FormBuilder.all_fields[rf.get('field_type')].edit({rf: rf}) )) == null ? '' : __t) +
'\n';

}
return __p
};

this["FormBuilder"]["templates"]["edit/base_non_input"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class=\'fb-field-label\'>\n  <span data-rv-text="model.label"></span>\n  <code class=\'field-type\' data-rv-text=\'model.field_type\'></code>\n  <span class=\'icon-arrow-right pull-right\'></span>\n</div>\n\n' +
((__t = ( FormBuilder.all_fields[rf.get('field_type')].edit({rf: rf}) )) == null ? '' : __t) +
'\n';

}
return __p
};

this["FormBuilder"]["templates"]["edit/common"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class=\'db-edit-section-header\'>Label</div>\n\n<div class=\'grid\'>\n  <div class=\'grid-item two_thirds\'>\n    <input type=\'text\' data-rv-input=\'model.label\' />\n    <textarea data-rv-input=\'model.field_options.description\' placeholder=\'Add a longer description to this field\'></textarea>\n  </div>\n  <div class=\'grid-item one_third\'>\n    <label>\n      Required\n      <input type=\'checkbox\' data-rv-checked=\'model.field_options.required\' />\n    </label>\n    <label>\n      Blind\n      <input type=\'checkbox\' data-rv-checked=\'model.field_options.blind\' />\n    </label>\n    <label>\n      Admin only\n      <input type=\'checkbox\' data-rv-checked=\'model.field_options.admin_only\' />\n    </label>\n  </div>\n</div>\n';

}
return __p
};

this["FormBuilder"]["templates"]["edit/integer_only"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class=\'fb-edit-section-header\'>Integer only</div>\n<label>\n  <input type=\'checkbox\' data-rv-checked=\'model.field_options.integer_only\' />\n  Only accept integers\n</label>\n';

}
return __p
};

this["FormBuilder"]["templates"]["edit/min_max"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class=\'fb-edit-section-header\'>Minimum / Maximum</div>\n\nAbove\n<input type="text" data-rv-input="model.field_options.min" style="width: 30px" />\n\n&nbsp;&nbsp;\n\nBelow\n<input type="text" data-rv-input="model.field_options.max" style="width: 30px" />\n';

}
return __p
};

this["FormBuilder"]["templates"]["edit/min_max_length"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class=\'fb-edit-section-header\'>Length Limit</div>\n\nMin\n<input type="text" data-rv-input="model.field_options.minlength" style="width: 30px" />\n\n&nbsp;&nbsp;\n\nMax\n<input type="text" data-rv-input="model.field_options.maxlength" style="width: 30px" />\n\n&nbsp;&nbsp;\n\n<select data-rv-value="model.field_options.min_max_length_units" style="width: auto;">\n  <option value="characters">characters</option>\n  <option value="words">words</option>\n</select>\n';

}
return __p
};

this["FormBuilder"]["templates"]["edit/options"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {
__p += '<div class=\'fb-edit-section-header\'>Options</div>\n\n';
 if (typeof includeBlank !== 'undefined'){ ;
__p += '\n  <label>\n    <input type=\'checkbox\' data-rv-checked=\'model.field_options.include_blank_option\' />\n    Include blank\n  </label>\n';
 } ;
__p += '\n\n<div class=\'option\' data-rv-each-option=\'model.field_options.options\'>\n  <input type="checkbox" class=\'js-default-updated\' data-rv-checked="option:checked" />\n  <input type="text" data-rv-input="option:label" class=\'option-label-input\' />\n  <a class="js-add-option" title="Add Option"><i class=\'icon-plus-sign\'></i></a>\n  <a class="js-remove-option" title="Remove Option"><i class=\'icon-minus-sign\'></i></a>\n</div>\n\n';
 if (typeof includeOther !== 'undefined'){ ;
__p += '\n  <label>\n    <input type=\'checkbox\' data-rv-checked=\'model.field_options.include_other_option\' />\n    Include "other"\n  </label>\n';
 } ;
__p += '\n\n<a class="js-add-option">Add option</a>\n';

}
return __p
};

this["FormBuilder"]["templates"]["edit/size"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class=\'fb-edit-section-header\'>Size</div>\n<select data-rv-value="model.field_options.size">\n  <option value="small">Small</option>\n  <option value="medium">Medium</option>\n  <option value="large">Large</option>\n</select>\n';

}
return __p
};

this["FormBuilder"]["templates"]["edit/units"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class=\'fb-edit-section-header\'>Units</div>\n<input type="text" data-rv-input="model.field_options.units" />\n';

}
return __p
};

this["FormBuilder"]["templates"]["page"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {
__p += '<div class=\'response-field-save-wrapper\'>\n  <button class=\'js-save-form\' data-loading-text=\'All changes saved\'>Save form</button>\n</div>\n\n<div class=\'fb-left\'>\n  <ul class=\'fb-tabs\'>\n    <li class=\'active\'><a data-target=\'#addField\'>Add new field</a></li>\n    <li><a data-target=\'#editField\'>Edit field</a></li>\n  </ul>\n\n  <div class=\'fb-tab-content\'>\n    <div class=\'fb-tab-pane active\' id=\'addField\'>\n      <div class=\'fb-add-field-types\'>\n        <div class=\'section\'>\n          ';
 for (i in FormBuilder.input_fields) { ;
__p += '\n            <a data-field-type="' +
((__t = ( i )) == null ? '' : __t) +
'">\n              ' +
((__t = ( FormBuilder.input_fields[i].addButton )) == null ? '' : __t) +
'\n            </a>\n          ';
 } ;
__p += '\n        </div>\n\n        <div class=\'section\'>\n          ';
 for (i in FormBuilder.non_input_fields) { ;
__p += '\n            <a data-field-type="' +
((__t = ( i )) == null ? '' : __t) +
'">\n              ' +
((__t = ( FormBuilder.non_input_fields[i].addButton )) == null ? '' : __t) +
'\n            </a>\n          ';
 } ;
__p += '\n        </div>\n      </div>\n    </div>\n\n    <div class=\'fb-tab-pane\' id=\'editField\'>\n      <div id=\'edit-response-field-wrapper\'></div>\n    </div>\n  </div>\n</div>\n\n<div class=\'fb-right\'>\n  <div class=\'fb-no-response-fields\'>No response fields</div>\n  <div class=\'fb-response-fields\'></div>\n</div>\n\n<div class=\'fb-clear\'></div>\n';

}
return __p
};

this["FormBuilder"]["templates"]["view/base"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class=\'subtemplate-wrapper\'>\n  <div class=\'cover\'></div>\n  ' +
((__t = ( FormBuilder.templates['view/label']({rf: rf}) )) == null ? '' : __t) +
'\n\n  ' +
((__t = ( FormBuilder.all_fields[rf.get('field_type')].view({rf: rf}) )) == null ? '' : __t) +
'\n\n  ' +
((__t = ( FormBuilder.templates['view/description']({rf: rf}) )) == null ? '' : __t) +
'\n  ' +
((__t = ( FormBuilder.templates['view/duplicate_remove']({rf: rf}) )) == null ? '' : __t) +
'\n</div>\n';

}
return __p
};

this["FormBuilder"]["templates"]["view/base_non_input"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class=\'subtemplate-wrapper\'>\n  <div class=\'cover\'></div>\n  ' +
((__t = ( FormBuilder.all_fields[rf.get('field_type')].view({rf: rf}) )) == null ? '' : __t) +
'\n  ' +
((__t = ( FormBuilder.templates['view/duplicate_remove']({rf: rf}) )) == null ? '' : __t) +
'\n</div>\n';

}
return __p
};

this["FormBuilder"]["templates"]["view/description"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<span class=\'help-block\'>' +
((__t = ( FormBuilder.helpers.simple_format(rf.get('field_options.description')) )) == null ? '' : __t) +
'</span>\n';

}
return __p
};

this["FormBuilder"]["templates"]["view/duplicate_remove"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<div class=\'actions-wrapper\'>\n  <a class="js-duplicate" title="Duplicate Field"><i class=\'icon-plus-sign\'></i></a>\n  <a class="js-clear" title="Remove Field"><i class=\'icon-minus-sign\'></i></a>\n</div>';

}
return __p
};

this["FormBuilder"]["templates"]["view/label"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape, __j = Array.prototype.join;
function print() { __p += __j.call(arguments, '') }
with (obj) {
__p += '<label>\n  <span>' +
((__t = ( FormBuilder.helpers.simple_format(rf.get('label')) )) == null ? '' : __t) +
'\n  ';
 if (rf.get('field_options.required')) { ;
__p += '\n    <abbr title=\'required\'>*</abbr>\n  ';
 } ;
__p += '\n</label>\n';

}
return __p
};
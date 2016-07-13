"use strict";

const Mousetrap = require('mousetrap');
const _ = require('underscore');

const UPDATE_EVENT = "update";
function bind(bindings) {
  _.each( bindings, ( binding, selector )=>{
    var elems = document.querySelectorAll(selector);
    _.each(elems, (elem)=>{
      if(binding.process instanceof Function){
        if(elem.tagName.toLowerCase() == "button"){
          elem.addEventListener('click', (ev)=>{
            binding.process.call(elem, ev)
          })
        }else{
          elem.addEventListener('change', (ev)=>{
            binding.process.call(elem, ev)
          })
        }
      }
      if(binding.update instanceof Function){
        // forced update
        elem.addEventListener(UPDATE_EVENT, (ev)=>{
          binding.update.call(elem, ev)
        })
      }
      if(binding.hasOwnProperty("command")){
        _.each(binding.command, (callback, command)=>{
          Mousetrap.bind(command, (ev)=>{
            if(callback instanceof Function) callback.call(elem, ev);
            if(binding.process instanceof Function) binding.process.call(elem, ev)
            if(binding.update instanceof Function) binding.update.call(elem)
            return false;
          });
        })
      }
      if(binding.update instanceof Function) binding.update.call(elem)
    })
  })
}

function unbind(bindings){
  _.each( bindings, ( binding, selector )=>{
    var elems = document.querySelectorAll(selector);
    _.each(elems, (elem)=>{
      elem.removeEventListener('change');
      elem.removeEventListener('click');
      elem.removeEventListener(UPDATE_EVENT);
      if(binding.hasOwnProperty("command")){
        _.each(binding.command, (callback, command)=>{
          Mousetrap.unbind(command);
        })
      }
    })
  })
}

function update(selector){
  var elems = document.querySelectorAll(selector);
  _.each(elems, (elem)=>{
    elem.dispatchEvent(new Event("update"))
  })
}

module.exports = {
  bind: bind,
  unbind: unbind,
  update: update,
  THRU(){}

}

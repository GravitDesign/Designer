// Old: public/pscore.js, systemdict findresource … resourceforall.
import type { PSCore } from "../core.ts";
import type { PSDict, PSPlainRecord, PSValue } from "../objects.ts";

/** The dictionary of a resource category (Category/<name>). */
function categoryEntries(core: PSCore, category: unknown): PSPlainRecord {
  const categories = core.resources.Category.value;
  return (categories[category as string] as PSDict).value;
}

export const resourceOperators = {
  findresource(this: PSCore) {
    this.fill$error();
    const name = "findresource";
    if (this.stackunderflowCheck(2, name)) return;
    const category = this.stack[this.stack.length - 1];
    const key = this.stack[this.stack.length - 2];
    if (
      (this.classes.isPSObject(category, "string") || this.classes.isPSObject(category, "name")) &&
      (this.classes.isPSObject(key, "string") || this.classes.isPSObject(key, "name"))
    ) {
      if (category.value in this.resources.Category.value) {
        const entries = categoryEntries(this, category.value);
        if (key.value in entries) {
          if (typeof entries[key.value] == "object") {
            this.stack.pop();
            this.stack.pop();
            this.stack.push(entries[key.value]);
          }
        } else this.initiateError("undefinedresource", name);
      } else this.initiateError("undefined", name);
    } else this.initiateError("typecheck", name);
  },

  resourcestatus(this: PSCore) {
    this.fill$error();
    const name = "resourcestatus";
    if (this.stackunderflowCheck(2, name)) return;
    const category = this.stack[this.stack.length - 1];
    const key = this.stack[this.stack.length - 2];
    if (
      (this.classes.isPSObject(category, "string") || this.classes.isPSObject(category, "name")) &&
      (this.classes.isPSObject(key, "string") ||
        this.classes.isPSObject(key, "name") ||
        this.classes.isInt(key))
    ) {
      if (category.value in this.resources.Category.value) {
        // Sic: an integer key reads `value` of a number (undefined).
        const keyName = (key as unknown as { value: string }).value;
        const entries = categoryEntries(this, category.value);
        if (keyName in entries) {
          if (typeof entries[keyName] == "object") {
            this.stack.pop();
            this.stack.pop();
            this.stack.push(0);
            this.stack.push(-1);
            this.stack.push(this.classes.newObject("bool", true));
          }
          return;
        }
        this.stack.pop();
        this.stack.pop();
        this.stack.push(this.classes.newObject("bool", false));
        return;
      }
      this.initiateError("undefined", name);
    } else this.initiateError("typecheck", name);
  },

  defineresource(this: PSCore) {
    this.fill$error();
    const name = "defineresource";
    if (this.stackunderflowCheck(3, name)) return;
    const key = this.stack[this.stack.length - 3];
    const instance = this.stack[this.stack.length - 2];
    const category = this.stack[this.stack.length - 1];
    if (
      (this.classes.isPSObject(category, "string") || this.classes.isPSObject(category, "name")) &&
      (this.classes.isPSObject(key, "string") || this.classes.isPSObject(key, "name"))
    ) {
      if (category.value in this.resources.Category.value) {
        this.stack.pop();
        this.stack.pop();
        this.stack.pop();
        categoryEntries(this, category.value)[key.value] = instance;
        this.stack.push(instance);
      } else this.initiateError("undefined", name);
    } else this.initiateError("typecheck", name);
  },

  undefineresource(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "undefineresource")) return;
    const key = this.stack[this.stack.length - 2];
    const category = this.stack[this.stack.length - 1];
    if (
      (this.classes.isPSObject(category, "string") || this.classes.isPSObject(category, "name")) &&
      (this.classes.isPSObject(key, "string") || this.classes.isPSObject(key, "name"))
    ) {
      this.stack.pop();
      this.stack.pop();
      Reflect.deleteProperty(categoryEntries(this, category.value), key.value);
    } else this.initiateError("typecheck", "undefineresource");
  },

  resourceforall(this: PSCore) {
    if (this.stackunderflowCheck(4)) return;
    const template = this.stack[this.stack.length - 4];
    const procedure = this.stack[this.stack.length - 3];
    const scratch = this.stack[this.stack.length - 2];
    const category = this.stack[this.stack.length - 1];
    if (
      this.classes.isPSObject(template, "string") &&
      this.classes.isPSObject(procedure, "array") &&
      procedure.executable !== false &&
      this.classes.isPSObject(scratch, "string") &&
      (this.classes.isPSObject(category, "string") || this.classes.isPSObject(category, "name"))
    ) {
      const pattern = this.templateToRegExp(template.value);
      this.stack.pop();
      this.stack.pop();
      this.stack.pop();
      this.stack.pop();
      for (const key in categoryEntries(this, category.value)) {
        if (key.match(pattern)) {
          scratch.value = key;
          this.stack.push(scratch);
          this.execstack.push(procedure);
          this.fill$error();
          procedure.execute(this);
          this.execstack.pop();
          if (this.stopFlag) break;
        }
      }
    } else {
      // Sic: the old code passed an undeclared variable `myname` here.
      throw new ReferenceError("myname is not defined");
    }
  },
} satisfies Record<string, PSValue>;

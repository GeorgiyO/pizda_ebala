class BeanContext {

    constructor() {
        Object.defineProperty(this, "beans", {
            writable: false,
            value: {}
        });
        this.configure();
    }

    bind(name, prop) {
        this.beans[name] = prop;
    }

    get(name) {
        return this.beans[name]();
    }

    autowire(obj) {
        Object.keys(obj).forEach((k) => {
            if (obj[k] !== undefined) return;

            const bean = this.get(k);
            if (bean !== undefined) obj[k] = bean;
        })
    }

    configure() {
    }
}

const context = new BeanContext();

context.bind("a", () => new A());
context.bind("b", () => new B());


class A {
    b;
    value = 344;

    constructor() {
        context.autowire(this);
    }
}

class B {
    value = 45;
}

console.log(new A());
console.log(context.beans);
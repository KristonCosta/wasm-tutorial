use criterion::{black_box, criterion_group, criterion_main, Criterion};


fn criterion_benchmark(c: &mut Criterion) {
    let mut universe = wasm_time::Universe::new();
    c.bench_function("universe tick", |b| b.iter(|| 
        for i in 0..10 {
            universe.tick()
        }
    ));
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
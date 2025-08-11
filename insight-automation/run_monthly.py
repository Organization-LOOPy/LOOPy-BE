from graph.monthly_graph import build_graph, GState

if __name__ == "__main__":
    app = build_graph()
    result = app.invoke(GState(cafeId=1, overwrite=False))
    print("=== PERIOD ===", result.report["period"])
    print("=== DONE ===", result.logs)

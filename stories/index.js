import ItemCard from "../src/components/itemCard";


storiesOf("Home Page/ItemCard", module)
  .add("default", () => <ItemCard movie={sample} />)
  .add("exception", () => {
    const sampleNoPoster = { ...sample, poster_path: undefined };
    return <ItemCard movie={sampleNoPoster} />;
  });